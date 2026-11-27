import { Protobuf } from "@core/protobuf.ts";
import { create } from "@bufbuild/protobuf";
import { signal } from "@preact/signals-core";
import { Result } from "better-result";
import { type ReadonlySignal, toReadonly } from "./signals.ts";

export type RadioConfigSection = Exclude<
  Protobuf.Config.Config["payloadVariant"]["case"],
  undefined
>;

export type RadioConfig = {
  readonly [V in RadioConfigSection]?: Extract<
    Protobuf.Config.Config["payloadVariant"],
    { case: V }
  >["value"];
};

export type ModuleConfigSection = Exclude<
  Protobuf.ModuleConfig.ModuleConfig["payloadVariant"]["case"],
  undefined
>;

export type ModuleConfig = {
  readonly [V in ModuleConfigSection]?: Extract<
    Protobuf.ModuleConfig.ModuleConfig["payloadVariant"],
    { case: V }
  >["value"];
};

type Channels = ReadonlyMap<number, Protobuf.Channel.Channel>;

/** A section as a form hands it over: any subset of its fields. */
export type SectionInit<T> = {
  [P in keyof T as P extends "$unknown" | "$typeName" ? never : P]?: T[P];
};
type AdminMessages = readonly Protobuf.Admin.AdminMessage[];

/**
 * What the editor needs from a connected device: the config it reports,
 * when it disconnects, and a way to send a settings transaction.
 */
export interface ConfigEditorIo {
  onConfig(cb: (config: Protobuf.Config.Config) => void): () => void;
  onModuleConfig(
    cb: (config: Protobuf.ModuleConfig.ModuleConfig) => void,
  ): () => void;
  onChannel(cb: (channel: Protobuf.Channel.Channel) => void): () => void;
  onDisconnect(cb: () => void): () => void;
  /** Sends `messages` between `begin_edit_settings` and `commit_edit_settings`. */
  commit(messages: AdminMessages): Promise<Result<void, Error>>;
  /** Sends one message on its own, outside a settings transaction. */
  send(message: Protobuf.Admin.AdminMessage): Promise<Result<void, Error>>;
}

/**
 * A commit that turns on managed mode alongside other changes. Firmware
 * ignores local admin as soon as managed mode is on, including the
 * `commit_edit_settings` that would save and restart, so that change has
 * to be sent by itself.
 */
export class ManagedModeNotAloneError extends Error {
  constructor() {
    super("Turning on managed mode must be saved on its own");
    this.name = "ManagedModeNotAloneError";
  }
}

/** One section of a save, as {@link ConfigEditor.commitEach} reports it. */
export type SavePart =
  | { readonly kind: "radio"; readonly section: RadioConfigSection }
  | { readonly kind: "module"; readonly section: ModuleConfigSection }
  | { readonly kind: "channel"; readonly index: number }
  | { readonly kind: "owner" }
  | { readonly kind: "queued"; readonly message: Protobuf.Admin.AdminMessage }
  | { readonly kind: "staged"; readonly key: string };

/** How one section of a {@link ConfigEditor.commitEach} went. */
export type SaveOutcome =
  | { readonly part: SavePart; readonly status: "saved" }
  | {
      readonly part: SavePart;
      readonly status: "failed";
      readonly error: Error;
    }
  /** Not sent: an earlier section's failure stopped the save. */
  | { readonly part: SavePart; readonly status: "skipped" };

export interface CommitOptions {
  /**
   * Send a change that turns on managed mode by itself (the default), as
   * the local radio needs. A remote node still takes admin from its admin
   * keys, so remote saves turn this off.
   */
  managedAlone?: boolean;
}

export interface CommitEachOptions {
  /** Stop after a section fails with an error this accepts. */
  stopOn?: (error: Error) => boolean;
}

export interface ConfigEditorOptions {
  /** Called for each staged admin message after a successful commit. */
  onStagedAdminMessageCommitted?: (
    message: Protobuf.Admin.AdminMessage,
  ) => void;
}

/**
 * Per-section editor for radio config, module config, channels and owner.
 *
 * Tracks what the device most recently sent (the baseline) and the UI's
 * edits (the working copy). Baseline updates never discard working edits;
 * dirtiness is recomputed against the new baseline. A disconnect resets
 * both so a stale working copy cannot leak into the next connection.
 */
export class ConfigEditor {
  private readonly io: ConfigEditorIo;
  private readonly baselineRadio = signal<RadioConfig>({});
  private readonly baselineModules = signal<ModuleConfig>({});
  private readonly baselineChannels = signal<Channels>(new Map());
  private readonly workingRadio = signal<RadioConfig>({});
  private readonly workingModules = signal<ModuleConfig>({});
  private readonly workingChannels = signal<Channels>(new Map());
  private readonly baselineOwner = signal<Protobuf.Mesh.User | undefined>(
    undefined,
  );
  private readonly workingOwner = signal<Protobuf.Mesh.User | undefined>(
    undefined,
  );
  private readonly queuedAdminMessages = signal<AdminMessages>([]);
  private readonly _stagedAdminMessages = signal<
    ReadonlyMap<string, Protobuf.Admin.AdminMessage>
  >(new Map());
  private readonly _dirtyRadioSections = signal<readonly RadioConfigSection[]>(
    [],
  );
  private readonly _dirtyModuleSections = signal<
    readonly ModuleConfigSection[]
  >([]);
  private readonly _dirtyChannels = signal<readonly number[]>([]);
  private readonly _isOwnerDirty = signal(false);
  private readonly _isDirty = signal(false);

  readonly radio: ReadonlySignal<RadioConfig> = toReadonly(this.workingRadio);
  readonly modules: ReadonlySignal<ModuleConfig> = toReadonly(
    this.workingModules,
  );
  readonly channels: ReadonlySignal<Channels> = toReadonly(
    this.workingChannels,
  );
  readonly dirtyRadioSections: ReadonlySignal<readonly RadioConfigSection[]> =
    toReadonly(this._dirtyRadioSections);
  readonly dirtyModuleSections: ReadonlySignal<readonly ModuleConfigSection[]> =
    toReadonly(this._dirtyModuleSections);
  readonly dirtyChannels: ReadonlySignal<readonly number[]> = toReadonly(
    this._dirtyChannels,
  );
  readonly owner: ReadonlySignal<Protobuf.Mesh.User | undefined> = toReadonly(
    this.workingOwner,
  );
  readonly isOwnerDirty: ReadonlySignal<boolean> = toReadonly(
    this._isOwnerDirty,
  );
  readonly isDirty: ReadonlySignal<boolean> = toReadonly(this._isDirty);
  /** What the device most recently sent, without the UI's edits. */
  readonly deviceRadio: ReadonlySignal<RadioConfig> = toReadonly(
    this.baselineRadio,
  );
  readonly deviceModules: ReadonlySignal<ModuleConfig> = toReadonly(
    this.baselineModules,
  );
  readonly deviceOwner: ReadonlySignal<Protobuf.Mesh.User | undefined> =
    toReadonly(this.baselineOwner);
  /**
   * Admin messages staged with {@link stageAdminMessage}, by key. Sent on
   * the next commit; cleared by commit, reset and disconnect.
   */
  readonly stagedAdminMessages: ReadonlySignal<
    ReadonlyMap<string, Protobuf.Admin.AdminMessage>
  > = toReadonly(this._stagedAdminMessages);

  private readonly onStagedAdminMessageCommitted?: (
    message: Protobuf.Admin.AdminMessage,
  ) => void;
  private readonly unsubscribe: Array<() => void>;
  private commitQueue: Promise<unknown> = Promise.resolve();
  /** Bumped on disconnect so an in-flight commit can tell. */
  private connectionGeneration = 0;

  constructor(io: ConfigEditorIo, options: ConfigEditorOptions = {}) {
    this.io = io;
    this.onStagedAdminMessageCommitted = options.onStagedAdminMessageCommitted;
    this.unsubscribe = [
      io.onConfig((config) => this.applyConfig(config)),
      io.onModuleConfig((config) => this.applyModuleConfig(config)),
      io.onChannel((channel) => this.applyChannel(channel)),
      io.onDisconnect(() => this.clear()),
    ];
  }

  dispose(): void {
    for (const off of this.unsubscribe) off();
  }

  private applyConfig(config: Protobuf.Config.Config): void {
    const variant = config.payloadVariant;
    if (!variant.case) return;
    const next: RadioConfig = {
      ...this.baselineRadio.peek(),
      [variant.case]: variant.value,
    };
    this.baselineRadio.value = next;
    if (!this._dirtyRadioSections.peek().includes(variant.case)) {
      this.workingRadio.value = {
        ...this.workingRadio.peek(),
        [variant.case]: variant.value,
      };
    }
    this.recomputeDirty();
  }

  private applyModuleConfig(config: Protobuf.ModuleConfig.ModuleConfig): void {
    const variant = config.payloadVariant;
    if (!variant.case) return;
    const next: ModuleConfig = {
      ...this.baselineModules.peek(),
      [variant.case]: variant.value,
    };
    this.baselineModules.value = next;
    if (!this._dirtyModuleSections.peek().includes(variant.case)) {
      this.workingModules.value = {
        ...this.workingModules.peek(),
        [variant.case]: variant.value,
      };
    }
    this.recomputeDirty();
  }

  private applyChannel(channel: Protobuf.Channel.Channel): void {
    const baseline = new Map(this.baselineChannels.peek());
    baseline.set(channel.index, channel);
    this.baselineChannels.value = baseline;
    if (!this._dirtyChannels.peek().includes(channel.index)) {
      const working = new Map(this.workingChannels.peek());
      working.set(channel.index, channel);
      this.workingChannels.value = working;
    }
    this.recomputeDirty();
  }

  private clear(): void {
    this.connectionGeneration++;
    this.baselineRadio.value = {};
    this.baselineModules.value = {};
    this.baselineChannels.value = new Map();
    this.baselineOwner.value = undefined;
    this.workingRadio.value = {};
    this.workingModules.value = {};
    this.workingChannels.value = new Map();
    this.workingOwner.value = undefined;
    this.queuedAdminMessages.value = [];
    this._stagedAdminMessages.value = new Map();
    this._dirtyRadioSections.value = [];
    this._dirtyModuleSections.value = [];
    this._dirtyChannels.value = [];
    this._isOwnerDirty.value = false;
    this._isDirty.value = false;
  }

  /** The device's current user, as the node database reports it. */
  setBaselineOwner(owner: Protobuf.Mesh.User | undefined): void {
    this.baselineOwner.value = owner;
    if (!this._isOwnerDirty.peek()) {
      this.workingOwner.value = owner;
    }
    this.recomputeDirty();
  }

  setOwner(owner: Protobuf.Mesh.User): void {
    this.workingOwner.value = owner;
    this.recomputeDirty();
  }

  /** Sends `message` inside the next commit; `reset` drops it. */
  queueAdminMessage(message: Protobuf.Admin.AdminMessage): void {
    this.queuedAdminMessages.value = [
      ...this.queuedAdminMessages.peek(),
      message,
    ];
    this.recomputeDirty();
  }

  /**
   * Stages `message` under `key`, replacing what was staged there, or
   * removes it with `undefined`. For settings outside Config and
   * ModuleConfig, such as the canned message list and the ringtone.
   */
  stageAdminMessage(
    key: string,
    message: Protobuf.Admin.AdminMessage | undefined,
  ): void {
    const current = this._stagedAdminMessages.peek();
    if (message === undefined && !current.has(key)) return;
    const next = new Map(current);
    if (message === undefined) {
      next.delete(key);
    } else {
      next.set(key, message);
    }
    this._stagedAdminMessages.value = next;
    this.recomputeDirty();
  }

  /**
   * Stages a radio config section. `value` is merged over the current
   * working (or baseline) section, so fields a form doesn't render keep
   * the device's value. `undefined` reverts the section to the baseline.
   */
  setRadioSection<K extends RadioConfigSection>(
    key: K,
    value: SectionInit<NonNullable<RadioConfig[K]>> | undefined,
  ): void {
    const working = this.workingRadio.peek();
    const baseline = this.baselineRadio.peek()[key];
    const current = working[key] ?? baseline;
    this.workingRadio.value = {
      ...working,
      [key]:
        value === undefined
          ? baseline
          : current
            ? { ...current, ...value }
            : radioConfigOf[key](value).payloadVariant.value,
    };
    this.recomputeDirty();
  }

  /** Stages a module config section, merged like {@link setRadioSection}. */
  setModuleSection<K extends ModuleConfigSection>(
    key: K,
    value: SectionInit<NonNullable<ModuleConfig[K]>> | undefined,
  ): void {
    const working = this.workingModules.peek();
    const baseline = this.baselineModules.peek()[key];
    const current = working[key] ?? baseline;
    this.workingModules.value = {
      ...working,
      [key]:
        value === undefined
          ? baseline
          : current
            ? { ...current, ...value }
            : moduleConfigOf[key](value).payloadVariant.value,
    };
    this.recomputeDirty();
  }

  setChannel(channel: Protobuf.Channel.Channel): void {
    const next = new Map(this.workingChannels.peek());
    next.set(channel.index, channel);
    this.workingChannels.value = next;
    this.recomputeDirty();
  }

  reset(): void {
    this.workingRadio.value = this.baselineRadio.peek();
    this.workingModules.value = this.baselineModules.peek();
    this.workingChannels.value = new Map(this.baselineChannels.peek());
    this.workingOwner.value = this.baselineOwner.peek();
    this._stagedAdminMessages.value = new Map();
    this.queuedAdminMessages.value = [];
    this.recomputeDirty();
  }

  /** Whether the next commit turns managed mode on. */
  enablesManagedMode(): boolean {
    return (
      this._dirtyRadioSections.peek().includes("security") &&
      this.workingRadio.peek().security?.isManaged === true &&
      this.baselineRadio.peek().security?.isManaged !== true
    );
  }

  /**
   * Sends every dirty section in one settings transaction. Commits run one
   * at a time; edits made during a commit stay dirty for the next one.
   */
  commit(options: CommitOptions = {}): Promise<Result<void, Error>> {
    const run = this.commitQueue.then(() => this.runCommit(options));
    this.commitQueue = run.catch(() => undefined);
    return run;
  }

  /**
   * Sends every dirty section as its own admin message, outside a settings
   * transaction, one after another. Each section that the device accepts
   * becomes the new baseline; the rest stay dirty. Errs only when the
   * device disconnects mid-save.
   */
  commitEach(
    options: CommitEachOptions = {},
  ): Promise<Result<readonly SaveOutcome[], Error>> {
    const run = this.commitQueue.then(() => this.runCommitEach(options));
    this.commitQueue = run.catch(() => undefined);
    return run;
  }

  private async runCommitEach({
    stopOn,
  }: CommitEachOptions): Promise<Result<readonly SaveOutcome[], Error>> {
    if (!this._isDirty.peek()) return Result.ok([]);

    const payload = this.collectPayload();
    const generation = this.connectionGeneration;
    const outcomes: SaveOutcome[] = [];
    const saved = new Set<PayloadEntry>();
    let stopped = false;
    for (const entry of payload.entries) {
      if (stopped) {
        outcomes.push({ part: entry.part, status: "skipped" });
        continue;
      }
      const result = await this.io.send(entry.message);
      if (generation !== this.connectionGeneration) {
        return Result.err(
          new Error("The device disconnected before the save finished"),
        );
      }
      if (Result.isError(result)) {
        outcomes.push({
          part: entry.part,
          status: "failed",
          error: result.error,
        });
        stopped = stopOn?.(result.error) ?? false;
        continue;
      }
      saved.add(entry);
      outcomes.push({ part: entry.part, status: "saved" });
    }

    const sent = onlyEntries(payload, saved);
    this.reconcileAfterCommit(sent);
    for (const message of sent.staged.values()) {
      this.onStagedAdminMessageCommitted?.(message);
    }
    return Result.ok(outcomes);
  }

  /** The sections the next commit would send, in send order. */
  pendingParts(): readonly SavePart[] {
    if (!this._isDirty.peek()) return [];
    return this.collectPayload().entries.map((entry) => entry.part);
  }

  private async runCommit({
    managedAlone = true,
  }: CommitOptions): Promise<Result<void, Error>> {
    if (!this._isDirty.peek()) return Result.ok(undefined);

    const payload = this.collectPayload();
    if (payload.messages.length === 0) return Result.ok(undefined);
    const generation = this.connectionGeneration;

    // Only the local radio stops listening once managed mode is on.
    const enablesManaged = managedAlone && this.enablesManagedMode();
    if (enablesManaged && payload.messages.length > 1) {
      return Result.err(new ManagedModeNotAloneError());
    }

    // Sent alone the write saves and restarts at once; inside a
    // transaction the device would drop the commit.
    const [only] = payload.messages;
    const result =
      enablesManaged && only
        ? await this.io.send(only)
        : await this.io.commit(payload.messages);
    if (Result.isError(result)) return Result.err(result.error);
    if (generation !== this.connectionGeneration) {
      return Result.err(
        new Error("The device disconnected before the commit finished"),
      );
    }

    this.reconcileAfterCommit(payload);
    for (const message of payload.staged.values()) {
      this.onStagedAdminMessageCommitted?.(message);
    }
    return Result.ok(undefined);
  }

  private collectPayload(): CommitPayload {
    const radio = this.workingRadio.peek();
    const radioSections = this._dirtyRadioSections
      .peek()
      .filter((section) => radio[section] !== undefined);
    const modules = this.workingModules.peek();
    const moduleSections = this._dirtyModuleSections
      .peek()
      .filter((section) => modules[section] !== undefined);
    const channels = this.workingChannels.peek();
    const channelPayload: Protobuf.Channel.Channel[] = [];
    for (const index of this._dirtyChannels.peek()) {
      const channel = channels.get(index);
      if (channel) channelPayload.push(channel);
    }
    const owner = this._isOwnerDirty.peek()
      ? this.workingOwner.peek()
      : undefined;
    const queued = this.queuedAdminMessages.peek();
    const staged = this._stagedAdminMessages.peek();

    const entries: PayloadEntry[] = [];
    for (const section of radioSections) {
      entries.push({
        part: { kind: "radio", section },
        message: admin({
          case: "setConfig",
          value: radioConfig(radio, section),
        }),
      });
    }
    for (const section of moduleSections) {
      entries.push({
        part: { kind: "module", section },
        message: admin({
          case: "setModuleConfig",
          value: moduleConfig(modules, section),
        }),
      });
    }
    for (const channel of channelPayload) {
      entries.push({
        part: { kind: "channel", index: channel.index },
        message: admin({ case: "setChannel", value: channel }),
      });
    }
    if (owner) {
      entries.push({
        part: { kind: "owner" },
        message: admin({ case: "setOwner", value: owner }),
      });
    }
    for (const message of queued) {
      entries.push({ part: { kind: "queued", message }, message });
    }
    for (const [key, message] of staged) {
      entries.push({ part: { kind: "staged", key }, message });
    }
    const messages = entries.map((entry) => entry.message);

    return {
      radio: { ...pick(radio, radioSections) },
      modules: { ...pick(modules, moduleSections) },
      channels: channelPayload,
      owner,
      queued,
      staged,
      entries,
      messages,
    };
  }

  /**
   * Makes only what was sent the new baseline. Other sections keep theirs,
   * including device packets that arrived during the commit.
   */
  private reconcileAfterCommit(payload: CommitPayload): void {
    if (Object.keys(payload.radio).length > 0) {
      this.baselineRadio.value = {
        ...this.baselineRadio.peek(),
        ...payload.radio,
      };
    }
    if (Object.keys(payload.modules).length > 0) {
      this.baselineModules.value = {
        ...this.baselineModules.peek(),
        ...payload.modules,
      };
    }
    if (payload.channels.length > 0) {
      const baseline = new Map(this.baselineChannels.peek());
      for (const channel of payload.channels) {
        baseline.set(channel.index, channel);
      }
      this.baselineChannels.value = baseline;
    }
    if (payload.owner) this.baselineOwner.value = payload.owner;

    // One entry per message sent: the same object may have been queued
    // again during the commit, and that copy hasn't been sent.
    if (payload.queued.length > 0) {
      const remaining = [...this.queuedAdminMessages.peek()];
      for (const message of payload.queued) {
        const index = remaining.indexOf(message);
        if (index !== -1) remaining.splice(index, 1);
      }
      this.queuedAdminMessages.value = remaining;
    }
    if (payload.staged.size > 0) {
      const unsent = new Map(this._stagedAdminMessages.peek());
      for (const [key, message] of payload.staged) {
        if (unsent.get(key) === message) unsent.delete(key);
      }
      this._stagedAdminMessages.value = unsent;
    }

    this.recomputeDirty();
  }

  private recomputeDirty(): void {
    const radioBase = this.baselineRadio.peek();
    const radioWorking = this.workingRadio.peek();
    const radioDirty = sectionsOf(radioBase, radioWorking).filter(
      (key) => !shallowEqual(radioBase[key], radioWorking[key]),
    );

    const moduleBase = this.baselineModules.peek();
    const moduleWorking = this.workingModules.peek();
    const moduleDirty = sectionsOf(moduleBase, moduleWorking).filter(
      (key) => !shallowEqual(moduleBase[key], moduleWorking[key]),
    );

    const channelBase = this.baselineChannels.peek();
    const channelWorking = this.workingChannels.peek();
    const channelDirty = [
      ...new Set([...channelBase.keys(), ...channelWorking.keys()]),
    ].filter(
      (idx) => !shallowEqual(channelBase.get(idx), channelWorking.get(idx)),
    );

    const ownerDirty = !shallowEqual(
      this.baselineOwner.peek(),
      this.workingOwner.peek(),
    );
    const hasQueuedAdmin =
      this.queuedAdminMessages.peek().length > 0 ||
      this._stagedAdminMessages.peek().size > 0;

    this._dirtyRadioSections.value = radioDirty;
    this._dirtyModuleSections.value = moduleDirty;
    this._dirtyChannels.value = channelDirty;
    this._isOwnerDirty.value = ownerDirty;
    this._isDirty.value =
      radioDirty.length > 0 ||
      moduleDirty.length > 0 ||
      channelDirty.length > 0 ||
      ownerDirty ||
      hasQueuedAdmin;
  }
}

interface CommitPayload {
  radio: RadioConfig;
  modules: ModuleConfig;
  channels: Protobuf.Channel.Channel[];
  /** Set only when the owner was dirty. */
  owner: Protobuf.Mesh.User | undefined;
  queued: AdminMessages;
  staged: ReadonlyMap<string, Protobuf.Admin.AdminMessage>;
  /** One per message, in send order, with the section it saves. */
  entries: PayloadEntry[];
  messages: Protobuf.Admin.AdminMessage[];
}

interface PayloadEntry {
  part: SavePart;
  message: Protobuf.Admin.AdminMessage;
}

/** The part of `payload` that `saved` covers, for reconciling a partial save. */
function onlyEntries(
  payload: CommitPayload,
  saved: ReadonlySet<PayloadEntry>,
): CommitPayload {
  const entries = payload.entries.filter((entry) => saved.has(entry));
  const parts = entries.map((entry) => entry.part);
  const radio: Record<string, unknown> = {};
  const modules: Record<string, unknown> = {};
  for (const part of parts) {
    if (part.kind === "radio")
      radio[part.section] = payload.radio[part.section];
    if (part.kind === "module") {
      modules[part.section] = payload.modules[part.section];
    }
  }
  const channelIndexes = new Set(
    parts.flatMap((part) => (part.kind === "channel" ? [part.index] : [])),
  );
  const stagedKeys = new Set(
    parts.flatMap((part) => (part.kind === "staged" ? [part.key] : [])),
  );
  const queued = new Set(
    parts.flatMap((part) => (part.kind === "queued" ? [part.message] : [])),
  );
  return {
    radio: radio as RadioConfig,
    modules: modules as ModuleConfig,
    channels: payload.channels.filter((channel) =>
      channelIndexes.has(channel.index),
    ),
    owner: parts.some((part) => part.kind === "owner")
      ? payload.owner
      : undefined,
    queued: payload.queued.filter((message) => queued.has(message)),
    staged: new Map([...payload.staged].filter(([key]) => stagedKeys.has(key))),
    entries,
    messages: entries.map((entry) => entry.message),
  };
}

function admin(
  payloadVariant: Protobuf.Admin.AdminMessage["payloadVariant"],
): Protobuf.Admin.AdminMessage {
  return create(Protobuf.Admin.AdminMessageSchema, { payloadVariant });
}

function sectionsOf<T extends object>(a: T, b: T): (keyof T & string)[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].filter(
    (key): key is keyof T & string => key in a || key in b,
  );
}

function pick<T extends object>(
  source: T,
  keys: readonly (keyof T)[],
): Partial<T> {
  const out: Partial<T> = {};
  for (const key of keys) out[key] = source[key];
  return out;
}

const radioConfigOf: {
  [K in RadioConfigSection]: (
    value: SectionInit<NonNullable<RadioConfig[K]>>,
  ) => Protobuf.Config.Config;
} = {
  bluetooth: (value) => config({ case: "bluetooth", value }),
  device: (value) => config({ case: "device", value }),
  deviceUi: (value) => config({ case: "deviceUi", value }),
  display: (value) => config({ case: "display", value }),
  lora: (value) => config({ case: "lora", value }),
  network: (value) => config({ case: "network", value }),
  position: (value) => config({ case: "position", value }),
  power: (value) => config({ case: "power", value }),
  security: (value) => config({ case: "security", value }),
  sessionkey: (value) => config({ case: "sessionkey", value }),
};

const moduleConfigOf: {
  [K in ModuleConfigSection]: (
    value: SectionInit<NonNullable<ModuleConfig[K]>>,
  ) => Protobuf.ModuleConfig.ModuleConfig;
} = {
  ambientLighting: (value) =>
    moduleConfigMessage({ case: "ambientLighting", value }),
  audio: (value) => moduleConfigMessage({ case: "audio", value }),
  cannedMessage: (value) =>
    moduleConfigMessage({ case: "cannedMessage", value }),
  detectionSensor: (value) =>
    moduleConfigMessage({ case: "detectionSensor", value }),
  externalNotification: (value) =>
    moduleConfigMessage({ case: "externalNotification", value }),
  meshBeacon: (value) => moduleConfigMessage({ case: "meshBeacon", value }),
  mqtt: (value) => moduleConfigMessage({ case: "mqtt", value }),
  neighborInfo: (value) => moduleConfigMessage({ case: "neighborInfo", value }),
  paxcounter: (value) => moduleConfigMessage({ case: "paxcounter", value }),
  rangeTest: (value) => moduleConfigMessage({ case: "rangeTest", value }),
  remoteHardware: (value) =>
    moduleConfigMessage({ case: "remoteHardware", value }),
  serial: (value) => moduleConfigMessage({ case: "serial", value }),
  statusmessage: (value) =>
    moduleConfigMessage({ case: "statusmessage", value }),
  storeForward: (value) => moduleConfigMessage({ case: "storeForward", value }),
  tak: (value) => moduleConfigMessage({ case: "tak", value }),
  telemetry: (value) => moduleConfigMessage({ case: "telemetry", value }),
  trafficManagement: (value) =>
    moduleConfigMessage({ case: "trafficManagement", value }),
};

type ConfigInit = NonNullable<
  Parameters<typeof create<typeof Protobuf.Config.ConfigSchema>>[1]
>;

type ModuleConfigInit = NonNullable<
  Parameters<typeof create<typeof Protobuf.ModuleConfig.ModuleConfigSchema>>[1]
>;

function config(
  payloadVariant: ConfigInit["payloadVariant"],
): Protobuf.Config.Config {
  return create(Protobuf.Config.ConfigSchema, { payloadVariant });
}

function moduleConfigMessage(
  payloadVariant: ModuleConfigInit["payloadVariant"],
): Protobuf.ModuleConfig.ModuleConfig {
  return create(Protobuf.ModuleConfig.ModuleConfigSchema, { payloadVariant });
}

export function radioConfig<K extends RadioConfigSection>(
  radio: RadioConfig,
  section: K,
): Protobuf.Config.Config {
  const value = radio[section];
  if (value === undefined) throw new Error(`No ${section} config to send`);
  return radioConfigOf[section](value);
}

export function moduleConfig<K extends ModuleConfigSection>(
  modules: ModuleConfig,
  section: K,
): Protobuf.ModuleConfig.ModuleConfig {
  const value = modules[section];
  if (value === undefined) throw new Error(`No ${section} config to send`);
  return moduleConfigOf[section](value);
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (
    a === undefined ||
    b === undefined ||
    a === null ||
    b === null ||
    typeof a !== "object" ||
    typeof b !== "object"
  ) {
    return false;
  }
  const aEntries = Object.entries(a);
  const bEntries = new Map(Object.entries(b));
  if (aEntries.length !== bEntries.size) return false;
  for (const [key, av] of aEntries) {
    const bv = bEntries.get(key);
    if (av === bv) continue;
    if (typeof av === "object" && typeof bv === "object") {
      if (!shallowEqual(av, bv)) return false;
    } else {
      return false;
    }
  }
  return true;
}
