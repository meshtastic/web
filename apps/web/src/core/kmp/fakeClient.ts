import type {
  AdminJs,
  AdminResultJs,
  ConnectionStateJs,
  MeshtasticClient,
  NodeChangeJs,
  SendHandleJs,
  SendOutcomeJs,
} from "@meshtastic/sdk-kmp";

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

export function adminOk(value?: Uint8Array, text?: string): AdminResultJs {
  return { ok: true, reason: null, value: value ?? null, text: text ?? null };
}

export function adminFailed(reason: string): AdminResultJs {
  return { ok: false, reason, value: null, text: null };
}

type Listeners<T> = Set<(value: T) => void>;

/**
 * A scripted stand-in for the facade's admin API: records every message
 * and answers from `results`, or `ok` once that runs out.
 */
export class FakeAdmin implements AdminJs {
  readonly sent: Uint8Array[] = [];
  readonly transactions: Uint8Array[][] = [];
  readonly results: AdminResultJs[] = [];

  constructor(readonly dest: number) {}

  async send(adminMessage: Uint8Array): Promise<AdminResultJs> {
    this.sent.push(adminMessage);
    return this.results.shift() ?? adminOk();
  }

  async editSettings(adminMessages: Uint8Array[]): Promise<AdminResultJs> {
    this.transactions.push(adminMessages);
    this.sent.push(...adminMessages);
    return this.results.shift() ?? adminOk();
  }
}

/**
 * A scripted stand-in for the facade's client, for tests: callers push
 * frames, states, nodes and packets, and record what the web client sent.
 */
export class FakeKmpClient implements MeshtasticClient {
  connectionState: ConnectionStateJs = state("disconnected");
  myNodeNum: number | null = null;
  readonly texts: Array<{
    text: string;
    to: number;
    channel: number;
    id: number;
  }> = [];
  readonly packets: Uint8Array[] = [];
  readonly requests: Array<{ kind: string; nodeNum: number }> = [];
  readonly disconnects: number[] = [];
  readonly connects: number[] = [];
  /** When set, `disconnect` resolves only when `settleDisconnects` is called. */
  holdDisconnects = false;
  private readonly pendingDisconnects: Array<() => void> = [];
  readonly admins = new Map<number, FakeAdmin>();
  /** Outcome every send resolves with; `settleSends` resolves the pending ones. */
  sendOutcome: Omit<SendOutcomeJs, "id"> = { ok: true, reason: null };
  /** When set, sends stay pending until `settleSends` is called. */
  holdSends = false;
  private nextSendId = 1;
  private readonly pendingSends: Array<(outcome: SendOutcomeJs) => void> = [];
  adminResult: AdminResultJs = adminOk();
  private frameListeners: Listeners<Uint8Array> = new Set();
  private stateListeners: Listeners<ConnectionStateJs> = new Set();
  private nodeListeners: Listeners<NodeChangeJs> = new Set();
  private packetListeners: Listeners<Uint8Array> = new Set();
  private telemetryListeners = new Map<number, Listeners<Uint8Array>>();

  /** When set, `connect` rejects with it. */
  connectError: Error | undefined;

  async connect(): Promise<void> {
    this.connects.push(Date.now());
    if (this.connectError) throw this.connectError;
    this.setState(state("connected"));
  }

  async disconnect(): Promise<void> {
    this.disconnects.push(Date.now());
    if (this.holdDisconnects) {
      await new Promise<void>((resolve) =>
        this.pendingDisconnects.push(resolve),
      );
    }
    this.setState(state("disconnected"));
  }

  settleDisconnects(): void {
    for (const resolve of this.pendingDisconnects.splice(0)) resolve();
  }

  onConnectionState(cb: (s: ConnectionStateJs) => void): () => void {
    this.stateListeners.add(cb);
    cb(this.connectionState);
    return () => this.stateListeners.delete(cb);
  }

  onNodeChange(cb: (change: NodeChangeJs) => void): () => void {
    this.nodeListeners.add(cb);
    return () => this.nodeListeners.delete(cb);
  }

  onPacket(cb: (bytes: Uint8Array) => void): () => void {
    this.packetListeners.add(cb);
    return () => this.packetListeners.delete(cb);
  }

  onTelemetry(nodeNum: number, cb: (bytes: Uint8Array) => void): () => void {
    const listeners = this.telemetryListeners.get(nodeNum) ?? new Set();
    listeners.add(cb);
    this.telemetryListeners.set(nodeNum, listeners);
    return () => listeners.delete(cb);
  }

  onFromRadio(cb: (bytes: Uint8Array) => void): () => void {
    this.frameListeners.add(cb);
    return () => this.frameListeners.delete(cb);
  }

  admin(dest = 0): FakeAdmin {
    const existing = this.admins.get(dest);
    if (existing) return existing;
    const created = new FakeAdmin(dest);
    this.admins.set(dest, created);
    return created;
  }

  sendText(text: string, to: number, channel: number): SendHandleJs {
    const handle = this.handle();
    this.texts.push({ text, to, channel, id: handle.id });
    return handle;
  }

  sendPacket(meshPacket: Uint8Array): SendHandleJs {
    this.packets.push(meshPacket);
    return this.handle();
  }

  requestNodeInfo(nodeNum: number): SendHandleJs {
    this.requests.push({ kind: "nodeInfo", nodeNum });
    return this.handle();
  }

  requestPosition(nodeNum: number): SendHandleJs {
    this.requests.push({ kind: "position", nodeNum });
    return this.handle();
  }

  /** Resolves every held send with `outcome`, or with `sendOutcome`. */
  settleSends(outcome?: Omit<SendOutcomeJs, "id">): void {
    const settled = this.pendingSends.splice(0);
    const result = outcome ?? this.sendOutcome;
    for (const resolve of settled) {
      resolve({ id: 0, ...result });
    }
  }

  private handle(): SendHandleJs {
    const id = this.nextSendId++;
    const outcome = new Promise<SendOutcomeJs>((resolve) => {
      const settle = (result: SendOutcomeJs): void =>
        resolve({ ...result, id });
      if (this.holdSends) {
        this.pendingSends.push(settle);
      } else {
        settle({ id, ...this.sendOutcome });
      }
    });
    return { id, outcome };
  }

  async traceRoute(dest: number): Promise<AdminResultJs> {
    this.requests.push({ kind: "traceRoute", nodeNum: dest });
    return this.adminResult;
  }

  async requestTelemetry(kind: string, nodeNum = 0): Promise<AdminResultJs> {
    this.requests.push({ kind: `telemetry:${kind}`, nodeNum });
    return this.adminResult;
  }

  emitFrame(bytes: Uint8Array): void {
    for (const cb of this.frameListeners) {
      cb(bytes);
    }
  }

  emitPacket(bytes: Uint8Array): void {
    for (const cb of this.packetListeners) {
      cb(bytes);
    }
  }

  emitNodeChange(change: NodeChangeJs): void {
    for (const cb of this.nodeListeners) {
      cb(change);
    }
  }

  emitTelemetry(nodeNum: number, bytes: Uint8Array): void {
    for (const cb of this.telemetryListeners.get(nodeNum) ?? []) {
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
