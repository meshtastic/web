import { signal } from "@preact/signals-core";
import type { MeshSession } from "./session.ts";
import { type ReadonlySignal, toReadonly } from "./signals.ts";

/** One session per connection, and which of them the app is looking at. */
export class MeshRegistry {
  private readonly sessions = new Map<number, MeshSession>();
  private readonly activeStore = signal<MeshSession | undefined>(undefined);

  readonly active: ReadonlySignal<MeshSession | undefined> = toReadonly(
    this.activeStore,
  );

  register(id: number, session: MeshSession): void {
    this.sessions.set(id, session);
  }

  unregister(id: number): void {
    const session = this.sessions.get(id);
    this.sessions.delete(id);
    if (session && this.activeStore.peek() === session) {
      this.activeStore.value = undefined;
    }
  }

  get(id: number): MeshSession | undefined {
    return this.sessions.get(id);
  }

  setActive(id: number): void {
    this.activeStore.value = this.sessions.get(id);
  }
}

/** The app-wide registry. */
export const meshRegistry = new MeshRegistry();
