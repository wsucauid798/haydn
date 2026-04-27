export type Listener<T> = (event: T) => void;

export class Emitter<TEvents> {
  private listeners = new Map<keyof TEvents, Set<Listener<unknown>>>();

  on<K extends keyof TEvents>(type: K, listener: Listener<TEvents[K]>): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener as Listener<unknown>);
    return () => this.off(type, listener);
  }

  off<K extends keyof TEvents>(type: K, listener: Listener<TEvents[K]>): void {
    this.listeners.get(type)?.delete(listener as Listener<unknown>);
  }

  emit<K extends keyof TEvents>(type: K, event: TEvents[K]): void {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const listener of set) {
      (listener as Listener<TEvents[K]>)(event);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
