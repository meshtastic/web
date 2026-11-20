/** A plain event: subscribe for later values, dispatch to every listener. */
export class Emitter<T> {
  private readonly listeners = new Set<(value: T) => void>();

  subscribe(listener: (value: T) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispatch(value: T): void {
    for (const listener of [...this.listeners]) {
      listener(value);
    }
  }
}
