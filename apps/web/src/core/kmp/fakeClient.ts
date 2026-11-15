import type { ConnectionStateJs, MeshtasticClient } from "@meshtastic/sdk-kmp";

export function state(
  kind: string,
  overrides: Partial<ConnectionStateJs> = {},
): ConnectionStateJs {
  return {
    kind,
    attempt: 0,
    maxAttempts: 10,
    phase: null,
    progress: 0,
    error: null,
    errorKind: null,
    ...overrides,
  };
}

/**
 * A scripted stand-in for the facade's client, for tests: callers push
 * frames and states and record what the web client sent.
 */
export class FakeKmpClient implements MeshtasticClient {
  connectionState: ConnectionStateJs = state("disconnected");
  myNodeNum: number | null = null;
  readonly sent: Uint8Array[] = [];
  readonly disconnects: number[] = [];
  private frameListeners = new Set<(bytes: Uint8Array) => void>();
  private stateListeners = new Set<(s: ConnectionStateJs) => void>();

  async connect(): Promise<void> {
    this.setState(state("connected"));
  }

  async disconnect(): Promise<void> {
    this.disconnects.push(Date.now());
    this.setState(state("disconnected"));
  }

  onConnectionState(cb: (s: ConnectionStateJs) => void): () => void {
    this.stateListeners.add(cb);
    cb(this.connectionState);
    return () => this.stateListeners.delete(cb);
  }

  onFromRadio(cb: (bytes: Uint8Array) => void): () => void {
    this.frameListeners.add(cb);
    return () => this.frameListeners.delete(cb);
  }

  sendRaw(toRadio: Uint8Array): void {
    if (this.connectionState.kind !== "connected") {
      const error = new Error("Client not connected");
      error.name = "not-connected";
      throw error;
    }
    this.sent.push(toRadio);
  }

  emitFrame(bytes: Uint8Array): void {
    for (const cb of this.frameListeners) {
      cb(bytes);
    }
  }

  setState(next: ConnectionStateJs): void {
    this.connectionState = next;
    for (const cb of this.stateListeners) {
      cb(next);
    }
  }
}
