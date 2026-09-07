export interface HistoryRequestToken { revision: number; signal: AbortSignal; }

export class HistoryRequestSequencer {
  private revision = 0;
  private controller: AbortController | undefined;

  invalidate(): void {
    this.revision += 1;
    this.controller?.abort();
    this.controller = undefined;
  }

  begin(): HistoryRequestToken {
    this.invalidate();
    this.controller = new AbortController();
    return { revision: this.revision, signal: this.controller.signal };
  }

  isCurrent(token: HistoryRequestToken): boolean {
    return token.revision === this.revision && !token.signal.aborted;
  }

  complete(token: HistoryRequestToken): void {
    if (this.isCurrent(token)) this.controller = undefined;
  }
}
