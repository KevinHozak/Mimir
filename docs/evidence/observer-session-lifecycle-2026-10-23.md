# Observer session lifecycle - 2026-10-23

Local automated evidence for MIM-S008; no hosted deployment or live Firebase session was changed.

The Chromium test imports the production observer transport and connects it to an isolated read-only HTTP authority using synthetic expired/fresh credentials. It checks one forced refresh after HTTP 401, clean EOF and abrupt-disconnect reconnection, in-flight rotation, repeated committed event identity, at most one upstream stream, zero mutations, and zero active streams/no retries after tab closure (2.5-second cleanup bound). Node checks cover concurrent-refresh coalescing, cancellation during token acquisition, rejected refreshed credentials, refresh failure and stopping retry timers.

The fixture does not prove Firebase SDK clock-driven refresh, real IAM behavior, Cloud Run cleanup telemetry, browser back/forward-cache restoration, or UI selection persistence during a genuine hosted refresh. Existing connected-observer browser coverage exercises Spark/Follow/history navigation separately. These remain explicit live acceptance limits; the private audience ceiling is unchanged.

Remedy: authenticated read requests retry one 401 with a forced token refresh; Firebase ID-token changes rotate the current stream without remounting the observer; clean EOF and errors share a three-second reconnect path. Readers are canceled and released on exit. Unmount and non-cached page departure stop retries.

Run: `npm run test:hosted-auth-boundary --workspace @mimir/web`. This command is included in `npm run verify:local`.

The signed-in observer zoom browser test also injects a rejected stream request and a token-change notification at five viewport widths (320, 375, 390, 800, 1280). It verifies forced refresh, a new live request, no page errors, read-only requests and preservation of a user-selected zoom value across rotation. Its Firebase adapter remains synthetic.
