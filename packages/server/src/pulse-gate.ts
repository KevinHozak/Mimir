export class PulseInFlightError extends Error {
  constructor() {
    super("a pulse is already in flight");
    this.name = "PulseInFlightError";
  }
}

export class PulseGate {
  private inFlight = false;

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
}
