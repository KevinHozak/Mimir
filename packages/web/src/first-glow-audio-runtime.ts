import type { FirstGlowAudioPreferences } from "./first-glow-audio.js";

export type FirstGlowAudioCue = "selection" | "arrival" | "charge-draw" | "charge-share" | "warning" | "interaction";
export type FirstGlowCommittedEvent = { id: string; tick: number; kind: string; message: string };

export function firstGlowAudioCueForEvent(event: FirstGlowCommittedEvent): FirstGlowAudioCue | null {
  if (/\bshared \d+ charge\b/i.test(event.message)) return "charge-share";
  if (/\bdrew \d+ charge\b/i.test(event.message)) return "charge-draw";
  if (/\b(met|interaction)\b/i.test(event.message)) return "interaction";
  if (/\b(waiting|blocked|could not|no reachable|warning)\b/i.test(event.message)) return "warning";
  if (/\b(completed |arrived|probed the wild cache)/i.test(event.message)) return "arrival";
  return null;
}

export class FirstGlowAudioEventLedger {
  private readonly seen = new Set<string>();

  accept(events: FirstGlowCommittedEvent[]): FirstGlowAudioCue[] {
    const cues: FirstGlowAudioCue[] = [];
    for (const event of [...events].sort((left, right) => left.tick - right.tick || left.id.localeCompare(right.id))) {
      if (this.seen.has(event.id)) continue;
      this.seen.add(event.id);
      const cue = firstGlowAudioCueForEvent(event);
      if (cue) cues.push(cue);
    }
    return cues;
  }
}

const cueShape: Record<FirstGlowAudioCue, { frequency: number; duration: number; type: OscillatorType; gain: number }> = {
  selection: { frequency: 520, duration: 0.08, type: "sine", gain: 0.22 },
  arrival: { frequency: 330, duration: 0.18, type: "triangle", gain: 0.2 },
  "charge-draw": { frequency: 620, duration: 0.16, type: "sine", gain: 0.2 },
  "charge-share": { frequency: 440, duration: 0.22, type: "sine", gain: 0.2 },
  warning: { frequency: 190, duration: 0.2, type: "triangle", gain: 0.18 },
  interaction: { frequency: 390, duration: 0.2, type: "sine", gain: 0.18 },
};

export class FirstGlowAudioRuntime {
  private readonly ledger = new FirstGlowAudioEventLedger();
  private context: AudioContext | null = null;
  private preferences: FirstGlowAudioPreferences;

  constructor(preferences: FirstGlowAudioPreferences) { this.preferences = preferences; }
  updatePreferences(preferences: FirstGlowAudioPreferences): void { this.preferences = preferences; }

  async enable(): Promise<void> {
    const AudioContextConstructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) throw new Error("Audio is unavailable");
    this.context ??= new AudioContextConstructor();
    await this.context.resume();
  }

  disable(): void { void this.context?.suspend(); }
  playSelection(): void { this.playCue("selection"); }
  playCommittedEvents(events: FirstGlowCommittedEvent[]): void { for (const cue of this.ledger.accept(events)) this.playCue(cue); }
  close(): void { void this.context?.close(); this.context = null; }

  private playCue(cue: FirstGlowAudioCue): void {
    if (!this.context || !this.preferences.enabled || this.preferences.muted || this.preferences.master <= 0 || this.preferences.effects <= 0) return;
    const shape = cueShape[cue];
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const peak = shape.gain * this.preferences.master * this.preferences.effects;
    oscillator.type = shape.type;
    oscillator.frequency.setValueAtTime(shape.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(80, shape.frequency * (cue === "warning" ? 0.7 : 1.15)), now + shape.duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + shape.duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + shape.duration + 0.02);
  }
}
