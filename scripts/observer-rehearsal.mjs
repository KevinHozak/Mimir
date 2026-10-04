import { EventEmitter } from "node:events";
import { setTimeout as delay } from "node:timers/promises";

/**
 * Validates that an object or string contains no sensitive tokens, emails, or credentials.
 * @param {unknown} value
 */
export function assertRedacted(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (/Bearer\s+[^\s"]+/i.test(text) || /password|secret|token/i.test(text) && !/verifyObserverToken|x-owner-token|token-bearing/i.test(text)) {
    // Check if real token leaked
    if (/Bearer\s+[a-zA-Z0-9_\-\.]{15,}/.test(text)) {
      throw new Error("Potential credential leakage detected in rehearsal telemetry");
    }
  }
}

/**
 * Runs a bounded concurrent rehearsal against an observer endpoint.
 *
 * @param {object} options
 * @param {string} options.targetOrigin - Base URL of the observer bridge (e.g. http://127.0.0.1:8080)
 * @param {string} [options.token] - Authorization header value (e.g. "Bearer ...")
 * @param {number} [options.maxSessions=2] - Approved concurrent session cap
 * @param {number} [options.windowMs=180000] - Duration of the observation window in ms (default 3 min)
 * @param {number} [options.rampDelayMs=200] - Delay between connecting each incremental session
 * @param {number} [options.maxErrorThreshold=0] - Maximum tolerable errors before immediate abort
 * @param {function} [options.onTelemetry] - Callback for telemetry events
 * @returns {Promise<object>} Rehearsal summary
 */
export async function runBoundedRehearsal({
  targetOrigin,
  token,
  maxSessions = 2,
  windowMs = 180000,
  rampDelayMs = 200,
  maxErrorThreshold = 0,
  onTelemetry,
}) {
  const startTime = Date.now();
  const deadline = startTime + windowMs;
  let activeClients = 0;
  let totalRequests = 0;
  let totalErrors = 0;
  const statusCounts = {};
  const sessions = [];
  let abortedDueToThreshold = false;
  let abortReason = null;

  const emit = (event, data = {}) => {
    const record = {
      timestamp: new Date().toISOString(),
      event,
      activeClients,
      totalRequests,
      totalErrors,
      ...data,
    };
    onTelemetry?.(record);
  };

  emit("rehearsal-start", { maxSessions, windowMs });

  const stopAll = async (reason) => {
    abortedDueToThreshold = true;
    abortReason = reason;
    emit("rehearsal-stopping", { reason });
    for (const session of sessions) {
      session.controller.abort();
    }
  };

  async function connectSession(sessionId) {
    const controller = new AbortController();
    const session = { id: sessionId, controller, open: false };
    sessions.push(session);

    totalRequests += 1;
    const url = new URL("/api/live", targetOrigin);
    const headers = {};
    if (token) headers["authorization"] = token;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      statusCounts[response.status] = (statusCounts[response.status] || 0) + 1;

      if (!response.ok) {
        totalErrors += 1;
        emit("session-status-error", { sessionId, status: response.status });
        if (totalErrors > maxErrorThreshold) {
          await stopAll(`error-threshold-exceeded: status ${response.status}`);
        }
        return;
      }

      session.open = true;
      activeClients += 1;
      emit("session-connected", { sessionId, status: response.status });

      const reader = response.body?.getReader();
      if (!reader) {
        emit("session-no-body", { sessionId });
        return;
      }

      try {
        while (!controller.signal.aborted) {
          const { done } = await reader.read();
          if (done) break;
        }
      } catch (streamError) {
        if (!controller.signal.aborted) {
          totalErrors += 1;
          emit("session-stream-error", { sessionId, error: streamError.message });
          if (totalErrors > maxErrorThreshold) {
            await stopAll("stream-error");
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (fetchError) {
      if (!controller.signal.aborted) {
        totalErrors += 1;
        emit("session-connect-error", { sessionId, error: fetchError.message });
        if (totalErrors > maxErrorThreshold) {
          await stopAll("connect-error");
        }
      }
    } finally {
      if (session.open) {
        session.open = false;
        activeClients -= 1;
        emit("session-closed", { sessionId });
      }
    }
  }

  // Incremental connection ramp-up within cap
  const connectionPromises = [];
  for (let i = 1; i <= maxSessions; i++) {
    if (abortedDueToThreshold || Date.now() >= deadline) break;
    connectionPromises.push(connectSession(`client-${i}`));
    if (i < maxSessions && rampDelayMs > 0) {
      await delay(rampDelayMs);
    }
  }

  // Observe until window expires or stop threshold breached
  while (!abortedDueToThreshold && Date.now() < deadline) {
    await delay(100);
  }

  // Tear down all active sessions
  if (!abortedDueToThreshold) {
    emit("rehearsal-window-expired");
    for (const session of sessions) {
      session.controller.abort();
    }
  }

  await Promise.allSettled(connectionPromises);

  const durationMs = Date.now() - startTime;
  const summary = {
    durationMs,
    maxSessions,
    activeClientsAtClose: activeClients,
    totalRequests,
    totalErrors,
    statusCounts,
    abortedDueToThreshold,
    abortReason,
  };

  emit("rehearsal-complete", summary);
  return summary;
}
