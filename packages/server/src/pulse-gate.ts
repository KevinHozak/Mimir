export class PulseInFlightError extends Error {
  constructor() {
    super("a pulse is already in flight");
    this.name = "PulseInFlightError";
  }
}

export class PulseGate {
  private inFlight = false;
  private tail: Promise<void> = Promise.resolve();

  get busy(): boolean {
    return this.inFlight;
  }

  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.inFlight) throw new PulseInFlightError();
    this.inFlight = true;
    try {
      return await operation();
    } finally {
      this.inFlight = false;
    }
  }

  /** Queue state-changing work behind pulses, backups, and other writers. */
  async runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const release = await this.acquireExclusive();
    try {
      return await operation();
    } finally {
      release();
    }
  }

  async acquireExclusive(): Promise<() => void> {
    const previous = this.tail;
    let releaseTail!: () => void;
    this.tail = new Promise<void>((resolve) => { releaseTail = resolve; });
    await previous;
    this.inFlight = true;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.inFlight = false;
      releaseTail();
    };
  }
}
