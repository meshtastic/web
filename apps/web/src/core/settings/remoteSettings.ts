import { create, fromBinary } from "@bufbuild/protobuf";
import type { AdminVariant } from "@core/kmp/admin.ts";
import {
  ConfigEditor,
  type ConfigEditorIo,
  type ModuleConfigSection,
  type RadioConfigSection,
  type SaveOutcome,
} from "@core/kmp/configEditor.ts";
import { Emitter } from "@core/kmp/emitter.ts";
import { type ReadonlySignal, toReadonly } from "@core/kmp/signals.ts";
import { adminFailureKind } from "@core/nodes/adminAccess.ts";
import { Protobuf } from "@core/protobuf.ts";
import type { AdminResultJs } from "@meshtastic/sdk-kmp";
import { signal } from "@preact/signals-core";
import { Result } from "better-result";

/** How long a section shows as loading before it reports no answer. */
export const REMOTE_LOAD_DEADLINE_MS = 30_000;
/**
 * How long a read stays open: an answer that arrives after the deadline,
 * but within this, still fills the section in.
 */
export const REMOTE_LATE_REPLY_MS = 120_000;

/** Something remote settings reads from the node on its own. */
export type RemoteLoadKey =
  | `config:${RadioConfigSection}`
  | `module:${ModuleConfigSection}`
  | "owner"
  | "metadata";

/** Why a read or write to the node failed. */
export type RemoteFailure = "unauthorized" | "unreachable" | "error";

export type RemoteLoadState =
  | { readonly status: "loading" }
  | { readonly status: "loaded" }
  | { readonly status: "failed"; readonly reason: RemoteFailure };

export interface RemoteSettingsDeps {
  sendAdmin: (
    variant: AdminVariant,
    dest: number,
    timeoutMs?: number,
  ) => Promise<Result<AdminResultJs, Error>>;
  /** Sends `messages` in one begin/commit settings transaction to `dest`. */
  editSettings: (
    messages: readonly Protobuf.Admin.AdminMessage[],
    dest: number,
    timeoutMs?: number,
  ) => Promise<Result<void, Error>>;
  /** Called when the link to the local radio goes down. */
  onDisconnect: (cb: () => void) => () => void;
  /** Forgets the node after it refuses this radio. */
  forgetNode?: (nodeNum: number) => void;
  deadlineMs?: number;
  lateReplyMs?: number;
}

/** A failure as remote settings shows it. */
export const remoteFailure = (error: Error): RemoteFailure =>
  adminFailureKind(error) ?? "error";

const CONFIG_TYPE: Record<
  RadioConfigSection,
  Protobuf.Admin.AdminMessage_ConfigType | undefined
> = {
  device: Protobuf.Admin.AdminMessage_ConfigType.DEVICE_CONFIG,
  position: Protobuf.Admin.AdminMessage_ConfigType.POSITION_CONFIG,
  power: Protobuf.Admin.AdminMessage_ConfigType.POWER_CONFIG,
  network: Protobuf.Admin.AdminMessage_ConfigType.NETWORK_CONFIG,
  display: Protobuf.Admin.AdminMessage_ConfigType.DISPLAY_CONFIG,
  lora: Protobuf.Admin.AdminMessage_ConfigType.LORA_CONFIG,
  bluetooth: Protobuf.Admin.AdminMessage_ConfigType.BLUETOOTH_CONFIG,
  security: Protobuf.Admin.AdminMessage_ConfigType.SECURITY_CONFIG,
  sessionkey: undefined,
  deviceUi: undefined,
};

const MODULE_TYPE: Record<
  ModuleConfigSection,
  Protobuf.Admin.AdminMessage_ModuleConfigType | undefined
> = {
  mqtt: Protobuf.Admin.AdminMessage_ModuleConfigType.MQTT_CONFIG,
  serial: Protobuf.Admin.AdminMessage_ModuleConfigType.SERIAL_CONFIG,
  externalNotification:
    Protobuf.Admin.AdminMessage_ModuleConfigType.EXTNOTIF_CONFIG,
  storeForward:
    Protobuf.Admin.AdminMessage_ModuleConfigType.STOREFORWARD_CONFIG,
  rangeTest: Protobuf.Admin.AdminMessage_ModuleConfigType.RANGETEST_CONFIG,
  telemetry: Protobuf.Admin.AdminMessage_ModuleConfigType.TELEMETRY_CONFIG,
  cannedMessage: Protobuf.Admin.AdminMessage_ModuleConfigType.CANNEDMSG_CONFIG,
  audio: Protobuf.Admin.AdminMessage_ModuleConfigType.AUDIO_CONFIG,
  remoteHardware:
    Protobuf.Admin.AdminMessage_ModuleConfigType.REMOTEHARDWARE_CONFIG,
  neighborInfo:
    Protobuf.Admin.AdminMessage_ModuleConfigType.NEIGHBORINFO_CONFIG,
  ambientLighting:
    Protobuf.Admin.AdminMessage_ModuleConfigType.AMBIENTLIGHTING_CONFIG,
  detectionSensor:
    Protobuf.Admin.AdminMessage_ModuleConfigType.DETECTIONSENSOR_CONFIG,
  paxcounter: Protobuf.Admin.AdminMessage_ModuleConfigType.PAXCOUNTER_CONFIG,
  statusmessage:
    Protobuf.Admin.AdminMessage_ModuleConfigType.STATUSMESSAGE_CONFIG,
  trafficManagement:
    Protobuf.Admin.AdminMessage_ModuleConfigType.TRAFFICMANAGEMENT_CONFIG,
  tak: Protobuf.Admin.AdminMessage_ModuleConfigType.TAK_CONFIG,
  meshBeacon: Protobuf.Admin.AdminMessage_ModuleConfigType.MESHBEACON_CONFIG,
};

/** The get request that reads `key`, if the node can be asked for it. */
export function requestFor(key: RemoteLoadKey): AdminVariant | undefined {
  if (key === "owner") return { case: "getOwnerRequest", value: true };
  if (key === "metadata") {
    return { case: "getDeviceMetadataRequest", value: true };
  }
  if (key.startsWith("config:")) {
    const type = CONFIG_TYPE[key.slice(7) as RadioConfigSection];
    return type === undefined
      ? undefined
      : { case: "getConfigRequest", value: type };
  }
  const type = MODULE_TYPE[key.slice(7) as ModuleConfigSection];
  return type === undefined
    ? undefined
    : { case: "getModuleConfigRequest", value: type };
}

/**
 * Refused before anything is sent: released firmware (2.8.2 and older)
 * gives a node a new key pair, and so a new identity, when a security
 * write carries no 32-byte private key. A node that withholds its key
 * (2.8.1+) can't have its security settings changed remotely.
 */
export class RemoteSecurityLockedError extends Error {
  constructor() {
    super(
      "The node didn't share its private key, so its security settings can't be written",
    );
    this.name = "RemoteSecurityLockedError";
  }
}

const PRIVATE_KEY_BYTES = 32;

/**
 * A security write carries exactly the private key the node sent; anything
 * else is refused. Other messages pass through.
 */
export function withNodePrivateKey(
  message: Protobuf.Admin.AdminMessage,
  nodeKey: Uint8Array | undefined,
): Result<Protobuf.Admin.AdminMessage, RemoteSecurityLockedError> {
  const variant = message.payloadVariant;
  if (
    variant.case !== "setConfig" ||
    variant.value.payloadVariant.case !== "security"
  ) {
    return Result.ok(message);
  }
  if (nodeKey?.length !== PRIVATE_KEY_BYTES) {
    return Result.err(new RemoteSecurityLockedError());
  }
  return Result.ok(
    create(Protobuf.Admin.AdminMessageSchema, {
      payloadVariant: {
        case: "setConfig",
        value: create(Protobuf.Config.ConfigSchema, {
          payloadVariant: {
            case: "security",
            value: {
              ...variant.value.payloadVariant.value,
              privateKey: nodeKey,
            },
          },
        }),
      },
    }),
  );
}

/**
 * Settings of another node, managed through the local radio. Each section
 * is read when it is first opened, with one get request to the node; each
 * changed section is saved with its own set_* message, never inside a
 * begin/commit transaction. Nothing here reaches the local radio's stores.
 */
export class RemoteSettings {
  readonly editor: ConfigEditor;
  readonly metadata: ReadonlySignal<Protobuf.Mesh.DeviceMetadata | undefined>;
  readonly loads: ReadonlySignal<ReadonlyMap<RemoteLoadKey, RemoteLoadState>>;

  private readonly configs = new Emitter<Protobuf.Config.Config>();
  private readonly moduleConfigs =
    new Emitter<Protobuf.ModuleConfig.ModuleConfig>();
  private readonly _metadata = signal<Protobuf.Mesh.DeviceMetadata | undefined>(
    undefined,
  );
  private readonly _loads = signal<ReadonlyMap<RemoteLoadKey, RemoteLoadState>>(
    new Map(),
  );
  /** Settles when a key's current load finishes, for Suspense. */
  private readonly waiting = new Map<RemoteLoadKey, Promise<void>>();
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  /** The latest attempt at each key, so an older one can't fail it. */
  private readonly attempts = new Map<RemoteLoadKey, number>();
  private readonly offDisconnect: () => void;
  /** Bumped on disconnect and dispose, so stale answers are dropped. */
  private generation = 0;

  constructor(
    readonly nodeNum: number,
    private readonly deps: RemoteSettingsDeps,
  ) {
    this.metadata = toReadonly(this._metadata);
    this.loads = toReadonly(this._loads);
    const disconnects = new Emitter<void>();
    this.offDisconnect = deps.onDisconnect(() => {
      this.reset();
      disconnects.dispatch();
    });
    this.editor = new ConfigEditor(this.io(disconnects));
  }

  private io(disconnects: Emitter<void>): ConfigEditorIo {
    return {
      onConfig: (cb) => this.configs.subscribe(cb),
      onModuleConfig: (cb) => this.moduleConfigs.subscribe(cb),
      // Channels aren't managed remotely yet.
      onChannel: () => () => {},
      onDisconnect: (cb) => disconnects.subscribe(cb),
      commit: async (messages) => {
        const prepared: Protobuf.Admin.AdminMessage[] = [];
        for (const message of messages) {
          const ready = this.prepare(message);
          if (Result.isError(ready)) return Result.err(ready.error);
          prepared.push(ready.value);
        }
        return this.deps.editSettings(
          prepared,
          this.nodeNum,
          this.deps.lateReplyMs ?? REMOTE_LATE_REPLY_MS,
        );
      },
      send: async (message) => {
        const ready = this.prepare(message);
        if (Result.isError(ready)) return Result.err(ready.error);
        const result = await this.deps.sendAdmin(
          ready.value.payloadVariant,
          this.nodeNum,
        );
        return Result.isError(result)
          ? Result.err(result.error)
          : Result.ok(undefined);
      },
    };
  }

  private prepare(
    message: Protobuf.Admin.AdminMessage,
  ): Result<Protobuf.Admin.AdminMessage, Error> {
    return withNodePrivateKey(
      message,
      this.editor.deviceRadio.peek().security?.privateKey,
    );
  }

  /**
   * Whether the node's security section can be saved: only when the node
   * sent its private key (firmware before 2.8.1), which goes back as is.
   */
  securityWritable(): boolean {
    return (
      this.editor.deviceRadio.peek().security?.privateKey.length ===
      PRIVATE_KEY_BYTES
    );
  }

  stateOf(key: RemoteLoadKey): RemoteLoadState | undefined {
    return this._loads.peek().get(key);
  }

  /**
   * Reads `key` from the node unless it is loaded or loading already.
   * Resolves when the read settles or gives up waiting.
   */
  load(key: RemoteLoadKey): Promise<void> {
    const state = this.stateOf(key);
    if (state?.status === "loaded") return Promise.resolve();
    const pending = this.waiting.get(key);
    if (pending && state?.status !== "failed") return pending;
    // Started on the next tick: a section asks while it renders, and the
    // state change must not land mid-render.
    const deferred = Promise.resolve().then(() => this.start(key));
    this.waiting.set(key, deferred);
    return deferred;
  }

  /** Reads `key` again, after a failure or to refresh it. */
  retry(key: RemoteLoadKey): Promise<void> {
    return this.start(key);
  }

  private start(key: RemoteLoadKey): Promise<void> {
    const variant = requestFor(key);
    if (!variant) {
      this.setState(key, { status: "failed", reason: "error" });
      return Promise.resolve();
    }
    this.setState(key, { status: "loading" });
    const generation = this.generation;
    const attempt = (this.attempts.get(key) ?? 0) + 1;
    this.attempts.set(key, attempt);
    const live = () => generation === this.generation;
    // Any attempt's answer fills the section in; only the latest may fail it.
    const latest = () => live() && this.attempts.get(key) === attempt;

    let settle: () => void = () => {};
    const settled = new Promise<void>((resolve) => {
      settle = resolve;
    });
    this.waiting.set(key, settled);

    // Past the deadline the section says so, but the request stays open
    // and a late answer still fills it in.
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      if (latest() && this.stateOf(key)?.status === "loading") {
        this.setState(key, { status: "failed", reason: "unreachable" });
      }
      settle();
    }, this.deps.deadlineMs ?? REMOTE_LOAD_DEADLINE_MS);
    this.timers.add(timer);

    void this.deps
      .sendAdmin(
        variant,
        this.nodeNum,
        this.deps.lateReplyMs ?? REMOTE_LATE_REPLY_MS,
      )
      .catch((cause: unknown) =>
        Result.err(cause instanceof Error ? cause : new Error(String(cause))),
      )
      .then((result) => {
        if (!live()) return;
        const applied = Result.isError(result)
          ? Result.err(result.error)
          : this.apply(key, result.value);
        if (Result.isOk(applied)) {
          this.setState(key, { status: "loaded" });
        } else if (latest() && this.stateOf(key)?.status === "loading") {
          // A late failure doesn't replace the "no answer" already shown.
          const reason = remoteFailure(applied.error);
          if (reason === "unauthorized") this.deps.forgetNode?.(this.nodeNum);
          this.setState(key, { status: "failed", reason });
        }
        clearTimeout(timer);
        this.timers.delete(timer);
        settle();
      });
    return settled;
  }

  private apply(
    key: RemoteLoadKey,
    answer: AdminResultJs,
  ): Result<void, Error> {
    const bytes = answer.value;
    if (!bytes) return Result.err(new Error("The node sent an empty answer"));
    return Result.try({
      try: () => {
        if (key === "owner") {
          this.editor.setBaselineOwner(
            fromBinary(Protobuf.Mesh.UserSchema, bytes),
          );
        } else if (key === "metadata") {
          this._metadata.value = fromBinary(
            Protobuf.Mesh.DeviceMetadataSchema,
            bytes,
          );
        } else if (key.startsWith("config:")) {
          this.configs.dispatch(
            fromBinary(Protobuf.Config.ConfigSchema, bytes),
          );
        } else {
          this.moduleConfigs.dispatch(
            fromBinary(Protobuf.ModuleConfig.ModuleConfigSchema, bytes),
          );
        }
      },
      catch: (cause) =>
        cause instanceof Error ? cause : new Error(String(cause)),
    });
  }

  private setState(key: RemoteLoadKey, state: RemoteLoadState): void {
    const next = new Map(this._loads.peek());
    next.set(key, state);
    this._loads.value = next;
  }

  /**
   * Saves the changed sections. One section goes as its own set_* message;
   * several go in one begin/commit transaction, because outside one the
   * node restarts after the first write that needs it and would lose the
   * rest. A transaction succeeds or fails as a whole. A refusal forgets
   * the node.
   */
  async save(): Promise<Result<readonly SaveOutcome[], Error>> {
    const parts = this.editor.pendingParts();
    let result: Result<readonly SaveOutcome[], Error>;
    if (parts.length <= 1) {
      result = await this.editor.commitEach();
    } else {
      const committed = await this.editor.commit({ managedAlone: false });
      result = Result.ok(
        parts.map((part): SaveOutcome =>
          Result.isOk(committed)
            ? { part, status: "saved" }
            : { part, status: "failed", error: committed.error },
        ),
      );
    }
    if (
      Result.isOk(result) &&
      result.value.some(
        (outcome) =>
          outcome.status === "failed" &&
          remoteFailure(outcome.error) === "unauthorized",
      )
    ) {
      this.deps.forgetNode?.(this.nodeNum);
    }
    return result;
  }

  private reset(): void {
    this.generation++;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    this.waiting.clear();
    this._loads.value = new Map();
    this._metadata.value = undefined;
  }

  dispose(): void {
    this.reset();
    this.offDisconnect();
    this.editor.dispose();
  }
}

/** A save's outcome per section, for the toast after Save. */
export function summarizeSave(outcomes: readonly SaveOutcome[]): {
  saved: number;
  failed: number;
  skipped: number;
  reason: RemoteFailure | undefined;
} {
  let saved = 0;
  let failed = 0;
  let skipped = 0;
  let reason: RemoteFailure | undefined;
  for (const outcome of outcomes) {
    if (outcome.status === "saved") saved++;
    if (outcome.status === "skipped") skipped++;
    if (outcome.status === "failed") {
      failed++;
      reason ??= remoteFailure(outcome.error);
    }
  }
  return { saved, failed, skipped, reason };
}
