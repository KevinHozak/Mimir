import type { FirstGlowAudioPreferences } from "./first-glow-audio.js";
import type { FirstGlowAudioMix } from "./first-glow-audio-ambience.js";

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
const musicAssetUrls = [
  "/audio/first-glow/weightless-shore.mp3",
  "/audio/first-glow/navigation-by-starlight.mp3",
  "/audio/first-glow/haven-under-starlight.mp3",
  "/audio/first-glow/where-the-light-pools.mp3",
];

export class FirstGlowAudioRuntime {
  private readonly ledger = new FirstGlowAudioEventLedger();
  private context: AudioContext | null = null;
  private preferences: FirstGlowAudioPreferences;
  private mix: FirstGlowAudioMix = { context: "open-space", ambienceLevel: 0.07, scoreLevel: 0.08 };
  private ambienceBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private musicBuffers: AudioBuffer[] = [];
  private musicSource: AudioBufferSourceNode | null = null;
  private musicAssetLoad: Promise<void> | null = null;
  private musicTrackIndex = 0;
  private ambientVoices: { oscillator: OscillatorNode; gain: GainNode; frequency: number; kind: "ambience" | "score" }[] = [];
  private ambientPulseTimer: number | null = null;
  private musicTestTimer: number | null = null;
  private ambienceTestTimer: number | null = null;

  constructor(preferences: FirstGlowAudioPreferences) { this.preferences = preferences; }
  updatePreferences(preferences: FirstGlowAudioPreferences): void { this.preferences = preferences; this.refreshAmbientVoices(); }

  async enable(): Promise<void> {
    const AudioContextConstructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) throw new Error("Audio is unavailable");
    this.context ??= new AudioContextConstructor();
    this.ensureBuses();
    await this.context.resume();
    await this.loadMusicAssets();
    this.startMusicAsset();
    this.refreshAmbientVoices();
  }

  disable(): void {
    this.stopTestSounds();
    if (this.ambientPulseTimer !== null) window.clearTimeout(this.ambientPulseTimer);
    this.ambientPulseTimer = null;
    void this.context?.suspend();
  }
  playSelection(): void { this.playCue("selection"); }
  toggleMusicTest(): boolean {
    if (this.musicTestTimer !== null) {
      window.clearInterval(this.musicTestTimer);
      this.musicTestTimer = null;
      return false;
    }
    if (!this.context || !this.musicBus || !this.preferences.enabled || this.preferences.muted || this.preferences.master <= 0 || this.preferences.music <= 0) return false;
    this.playMusicTestPhrase();
    this.musicTestTimer = window.setInterval(() => this.playMusicTestPhrase(), 1400);
    return true;
  }
  private playMusicTestPhrase(): void {
    if (!this.context || !this.musicBus) return;
    const now = this.context.currentTime;
    [392, 523.25].forEach((frequency, index) => {
      const oscillator = this.context!.createOscillator();
      const gain = this.context!.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now + index * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.16 * this.preferences.master * this.preferences.music, now + index * 0.14 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.14 + 0.42);
      oscillator.connect(gain).connect(this.musicBus!);
      oscillator.start(now + index * 0.14);
      oscillator.stop(now + index * 0.14 + 0.46);
    });
  }
  toggleAmbienceTest(): boolean {
    if (this.ambienceTestTimer !== null) {
      window.clearInterval(this.ambienceTestTimer);
      this.ambienceTestTimer = null;
      return false;
    }
    if (!this.context || !this.ambienceBus || !this.preferences.enabled || this.preferences.muted || this.preferences.master <= 0 || !this.preferences.ambienceEnabled) return false;
    this.playAmbienceTestPulse();
    this.ambienceTestTimer = window.setInterval(() => this.playAmbienceTestPulse(), 2400);
    return true;
  }
  private playAmbienceTestPulse(): void {
    if (!this.context || !this.ambienceBus) return;
    const now = this.context.currentTime;
    [[110, "sine"], [165, "triangle"]].forEach(([frequency, type], index) => {
      const oscillator = this.context!.createOscillator();
      const gain = this.context!.createGain();
      oscillator.type = type as OscillatorType;
      oscillator.frequency.setValueAtTime(frequency as number, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime((index === 0 ? 0.16 : 0.1) * this.preferences.master, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
      oscillator.connect(gain).connect(this.ambienceBus!);
      oscillator.start(now);
      oscillator.stop(now + 1.9);
    });
  }
  playEffectsTest(): void { this.playCue("selection"); }
  stopTestSounds(): void {
    if (this.musicTestTimer !== null) window.clearInterval(this.musicTestTimer);
    if (this.ambienceTestTimer !== null) window.clearInterval(this.ambienceTestTimer);
    this.musicTestTimer = null;
    this.ambienceTestTimer = null;
  }
  playCommittedEvents(events: FirstGlowCommittedEvent[]): void { for (const cue of this.ledger.accept(events)) this.playCue(cue); }
  updateAmbientMix(mix: FirstGlowAudioMix): void {
    this.mix = mix;
    this.refreshAmbientVoices();
  }
  close(): void {
    this.stopTestSounds();
    if (this.musicSource) {
      this.musicSource.onended = null;
      try { this.musicSource.stop(); } catch { /* already stopped */ }
    }
    if (this.ambientPulseTimer !== null) window.clearTimeout(this.ambientPulseTimer);
    this.ambientPulseTimer = null;
    this.ambientVoices.forEach(voice => { try { voice.oscillator.stop(); } catch { /* already stopped */ } voice.oscillator.disconnect(); voice.gain.disconnect(); });
    this.ambientVoices = [];
    void this.context?.close();
    this.context = null;
    this.ambienceBus = null;
    this.effectsBus = null;
    this.musicBus = null;
    this.musicBuffers = [];
    this.musicSource = null;
    this.musicAssetLoad = null;
  }

  private playCue(cue: FirstGlowAudioCue): void {
    if (!this.context || !this.effectsBus || !this.preferences.enabled || this.preferences.muted || this.preferences.master <= 0 || this.preferences.effects <= 0) return;
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
    oscillator.connect(gain).connect(this.effectsBus);
    oscillator.start(now);
    oscillator.stop(now + shape.duration + 0.02);
  }

  private ensureBuses(): void {
    if (!this.context || this.ambienceBus) return;
    this.ambienceBus = this.context.createGain();
    this.musicBus = this.context.createGain();
    this.effectsBus = this.context.createGain();
    this.ambienceBus.connect(this.context.destination);
    this.musicBus.connect(this.context.destination);
    this.effectsBus.connect(this.context.destination);
    this.setBusGain(this.ambienceBus, 0);
    this.setBusGain(this.musicBus, 0);
    this.setBusGain(this.effectsBus, this.preferences.effects * this.preferences.master);
  }

  private setBusGain(bus: GainNode, value: number): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.linearRampToValueAtTime(Math.max(0, value), now + 0.8);
  }

  private refreshAmbientVoices(): void {
    if (!this.context || !this.ambienceBus || !this.musicBus) return;
    const active = this.preferences.enabled && !this.preferences.muted;
    this.setBusGain(this.ambienceBus, active && this.preferences.ambienceEnabled ? this.preferences.master : 0);
    this.setBusGain(this.musicBus, active && this.preferences.scoreEnabled ? this.preferences.master : 0);
    this.setBusGain(this.effectsBus!, active ? this.preferences.master * this.preferences.effects : 0);
    if (active && this.preferences.scoreEnabled) this.startMusicAsset();
    if (active && (this.preferences.ambienceEnabled || this.preferences.scoreEnabled)) {
      this.ensureAmbientVoices();
      this.scheduleAmbientPulse();
    } else if (this.ambientPulseTimer !== null) {
      window.clearTimeout(this.ambientPulseTimer);
      this.ambientPulseTimer = null;
    }
  }

  private ensureAmbientVoices(): void {
    if (!this.context || !this.ambienceBus || !this.musicBus || this.ambientVoices.length > 0) return;
    const makeVoice = (frequency: number, bus: GainNode, type: OscillatorType, kind: "ambience" | "score") => {
      const oscillator = this.context!.createOscillator();
      const gain = this.context!.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.value = 0.0001;
      oscillator.connect(gain).connect(bus);
      oscillator.start();
      this.ambientVoices.push({ oscillator, gain, frequency, kind });
    };
    makeVoice(92, this.ambienceBus, "sine", "ambience");
    makeVoice(138, this.ambienceBus, "triangle", "ambience");
    makeVoice(196, this.musicBus, "sine", "score");
    makeVoice(246.94, this.musicBus, "sine", "score");
    makeVoice(293.66, this.musicBus, "sine", "score");
  }

  private scheduleAmbientPulse(): void {
    if (this.ambientPulseTimer !== null || !this.context) return;
    this.ambientPulseTimer = window.setTimeout(() => {
      this.ambientPulseTimer = null;
      if (!this.context || !this.preferences.enabled || this.preferences.muted) return;
      const now = this.context.currentTime;
      const ambienceTarget = this.preferences.ambienceEnabled ? this.mix.ambienceLevel * this.preferences.master : 0;
      const scoreTarget = this.preferences.scoreEnabled && this.musicBuffers.length === 0 ? this.mix.scoreLevel * this.preferences.master * this.preferences.music : 0;
      this.ambientVoices.forEach((voice, index) => {
        const isScore = voice.kind === "score";
        const scoreIndex = isScore ? index - 2 : 0;
        const start = isScore ? now + scoreIndex * 0.52 : now;
        const target = isScore ? scoreTarget * (scoreIndex === 1 ? 0.82 : 0.7) : ambienceTarget * (index === 0 ? 0.65 : 0.42);
        voice.gain.cancelScheduledValues(now);
        voice.gain.setValueAtTime(0.0001, start);
        voice.gain.linearRampToValueAtTime(Math.max(0.0001, target), start + (isScore ? 0.28 : 1.1));
        voice.gain.linearRampToValueAtTime(0.0001, start + (isScore ? 1.75 : 3.2));
      });
      this.ambientPulseTimer = window.setTimeout(() => { this.ambientPulseTimer = null; this.scheduleAmbientPulse(); }, 7000);
    }, 1200);
  }

  private async loadMusicAssets(): Promise<void> {
    if (!this.context || this.musicBuffers.length > 0) return;
    this.musicAssetLoad ??= Promise.all(musicAssetUrls.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`music asset unavailable: ${url}`);
      return this.context!.decodeAudioData(await response.arrayBuffer());
    })).then((buffers) => { this.musicBuffers = buffers; }).catch(() => { this.musicBuffers = []; });
    await this.musicAssetLoad;
  }

  private startMusicAsset(): void {
    if (!this.context || !this.musicBus || !this.preferences.enabled || this.preferences.muted || !this.preferences.scoreEnabled || this.musicBuffers.length === 0 || this.musicSource) return;
    const source = this.context.createBufferSource();
    source.buffer = this.musicBuffers[this.musicTrackIndex % this.musicBuffers.length];
    source.connect(this.musicBus);
    source.onended = () => {
      if (this.musicSource !== source) return;
      this.musicSource = null;
      this.musicTrackIndex = (this.musicTrackIndex + 1) % this.musicBuffers.length;
      this.startMusicAsset();
    };
    this.musicSource = source;
    source.start();
  }
}
