import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { signal } from "@preact/signals-core";
import { Result } from "better-result";
import type { MeshClient } from "../../../core/client/MeshClient.ts";
import {
  type ReadonlySignal,
  toReadonly,
} from "../../../core/signals/createStore.ts";
import { setChannel } from "../../channels/application/ChannelUseCases.ts";
import { DeviceStatusEnum } from "../../device/domain/DeviceStatus.ts";
import { sendAdminMessage } from "../../device/infrastructure/AdminMessageSender.ts";
import { setOwner } from "../../nodes/application/SetOwnerUseCase.ts";
import {
  beginEditSettings,
  commitEditSettings,
  setConfig,
  setModuleConfig,
} from "../application/ConfigUseCases.ts";
import { ConfigMapper } from "../infrastructure/ConfigMapper.ts";
import type { ModuleConfig, ModuleConfigSection } from "./ModuleConfig.ts";
import type { RadioConfig, RadioConfigSection } from "./RadioConfig.ts";

/**
 * Per-section editor for radio config, module config, and channels.
 *
 * Tracks two views:
 *
 * - **Baseline**: what the device most recently sent. Updated automatically
 *   from `onConfigPacket` / `onModuleConfigPacket` / `onChannelPacket` and
 *   re-applied as the post-commit truth.
 * - **Working copy**: UI edits. Set via `setRadioSection` / `setModuleSection`
 *   / `setChannel`. Mid-edit baseline updates do NOT discard working changes;
 *   `dirty*` recomputes against the new baseline so the user keeps their edits.
 *
 * On disconnect both signals reset to empty so a stale working copy can never
 * leak across reconnects. The next `onConfigPacket` re-fills baseline; working
 * stays equal to baseline until the user edits again.
 */
export class ConfigEditor {
  private readonly client: MeshClient;
  private readonly baselineRadio = signal<RadioConfig>({});
  private readonly baselineModules = signal<ModuleConfig>({});
  private readonly baselineChannels = signal<
    ReadonlyMap<number, Protobuf.Channel.Channel>
  >(new Map());
  private readonly workingRadio = signal<RadioConfig>({});
  private readonly workingModules = signal<ModuleConfig>({});
  private readonly workingChannels = signal<
    ReadonlyMap<number, Protobuf.Channel.Channel>
  >(new Map());
  private readonly baselineOwner = signal<Protobuf.Mesh.User | undefined>(
    undefined,
  );
  private readonly workingOwner = signal<Protobuf.Mesh.User | undefined>(
    undefined,
  );
  private readonly queuedAdminMessages = signal<
    readonly Protobuf.Admin.AdminMessage[]
  >([]);
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
  private readonly _isOwnerDirty = signal<boolean>(false);
  private readonly _isDirty = signal<boolean>(false);

  public readonly radio: ReadonlySignal<RadioConfig> = toReadonly(
    this.workingRadio,
  );
  public readonly modules: ReadonlySignal<ModuleConfig> = toReadonly(
    this.workingModules,
  );
  public readonly channels: ReadonlySignal<
    ReadonlyMap<number, Protobuf.Channel.Channel>
  > = toReadonly(this.workingChannels);
  public readonly dirtyRadioSections: ReadonlySignal<
    readonly RadioConfigSection[]
  > = toReadonly(this._dirtyRadioSections);
  public readonly dirtyModuleSections: ReadonlySignal<
    readonly ModuleConfigSection[]
  > = toReadonly(this._dirtyModuleSections);
  public readonly dirtyChannels: ReadonlySignal<readonly number[]> = toReadonly(
    this._dirtyChannels,
  );
  public readonly owner: ReadonlySignal<Protobuf.Mesh.User | undefined> =
    toReadonly(this.workingOwner);
  public readonly isOwnerDirty: ReadonlySignal<boolean> = toReadonly(
    this._isOwnerDirty,
  );
  public readonly isDirty: ReadonlySignal<boolean> = toReadonly(this._isDirty);
  /**
   * Admin messages staged with {@link stageAdminMessage}, by key. Sent on the
   * next commit; cleared by commit, reset and disconnect.
   */
  public readonly stagedAdminMessages: ReadonlySignal<
    ReadonlyMap<string, Protobuf.Admin.AdminMessage>
  > = toReadonly(this._stagedAdminMessages);

  private readonly onStagedAdminMessageCommitted?: (
    message: Protobuf.Admin.AdminMessage,
  ) => void;

  private commitQueue: Promise<unknown> = Promise.resolve();
  /** Bumped on disconnect so an in-flight commit can tell. */
  private connectionGeneration = 0;

  constructor(
    client: MeshClient,
    options: {
      /** Called for each staged admin message after a successful commit. */
      onStagedAdminMessageCommitted?: (
        message: Protobuf.Admin.AdminMessage,
      ) => void;
    } = {},
  ) {
    this.client = client;
    this.onStagedAdminMessageCommitted = options.onStagedAdminMessageCommitted;

    client.events.onConfigPacket.subscribe((config) => {
      const next = ConfigMapper.mergeRadio(this.baselineRadio.peek(), config);
      this.baselineRadio.value = next;
      const variant = config.payloadVariant.case;
      if (variant) {
        // Apply baseline changes that don't conflict with a pending edit. If
        // the user has already touched this section in the working copy, leave
        // their edit in place; the dirty bookkeeping will refresh below.
        const wasDirty = this._dirtyRadioSections.peek().includes(variant);
        if (!wasDirty) {
          this.workingRadio.value = {
            ...this.workingRadio.peek(),
            [variant]: next[variant],
          };
        }
      }
      this.recomputeDirty();
    });

    client.events.onModuleConfigPacket.subscribe((moduleConfig) => {
      const next = ConfigMapper.mergeModule(
        this.baselineModules.peek(),
        moduleConfig,
      );
      this.baselineModules.value = next;
      const variant = moduleConfig.payloadVariant.case;
      if (variant) {
        const wasDirty = this._dirtyModuleSections.peek().includes(variant);
        if (!wasDirty) {
          this.workingModules.value = {
            ...this.workingModules.peek(),
            [variant]: next[variant],
          };
        }
      }
      this.recomputeDirty();
    });

    client.events.onChannelPacket.subscribe((channel) => {
      const baseline = new Map(this.baselineChannels.peek());
      baseline.set(channel.index, channel);
      this.baselineChannels.value = baseline;
      const wasDirty = this._dirtyChannels.peek().includes(channel.index);
      if (!wasDirty) {
        const working = new Map(this.workingChannels.peek());
        working.set(channel.index, channel);
        this.workingChannels.value = working;
      }
      this.recomputeDirty();
    });

    client.events.onDeviceStatus.subscribe((status) => {
      if (status === DeviceStatusEnum.DeviceDisconnected) {
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
    });
  }

  /**
   * Update the baseline owner (the device's current user). Web pulls this
   * from `useMyNode().user` after the NodeInfo packet arrives, so we accept
   * it through a setter rather than subscribing to a SDK signal.
   */
  public setBaselineOwner(owner: Protobuf.Mesh.User | undefined): void {
    this.baselineOwner.value = owner;
    if (!this._isOwnerDirty.peek()) {
      this.workingOwner.value = owner;
    }
    this.recomputeDirty();
  }

  public setOwner(owner: Protobuf.Mesh.User): void {
    this.workingOwner.value = owner;
    this.recomputeDirty();
  }

  /**
   * Queue an arbitrary admin message to be sent inside the next commit
   * (between beginEdit and commitEdit). Used for one-off side flows like
   * setFixedPosition where the user wants to commit a pending coordinate
   * alongside their other edits.
   */
  public queueAdminMessage(message: Protobuf.Admin.AdminMessage): void {
    this.queuedAdminMessages.value = [
      ...this.queuedAdminMessages.peek(),
      message,
    ];
    this.recomputeDirty();
  }

  /**
   * Stage an admin message under `key`, replacing any message staged under
   * the same key, or remove it with `undefined`. Unlike
   * {@link queueAdminMessage}, a form can call this on every change and
   * {@link reset} drops it. Used for settings that live outside Config and
   * ModuleConfig, such as the canned message list and the ringtone.
   */
  public stageAdminMessage(
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
   * Stage a radio config section. `value` is merged over the current working
   * (or baseline) section, so fields a form doesn't render keep the device's
   * value instead of being sent as protobuf defaults.
   */
  public setRadioSection<K extends RadioConfigSection & string>(
    key: K,
    value: RadioConfig[K],
  ): void {
    const working = this.workingRadio.peek();
    const current = working[key] ?? this.baselineRadio.peek()[key];
    this.workingRadio.value = {
      ...working,
      [key]: current && value ? { ...current, ...value } : value,
    };
    this.recomputeDirty();
  }

  /** Stage a module config section, merged like {@link setRadioSection}. */
  public setModuleSection<K extends ModuleConfigSection & string>(
    key: K,
    value: ModuleConfig[K],
  ): void {
    const working = this.workingModules.peek();
    const current = working[key] ?? this.baselineModules.peek()[key];
    this.workingModules.value = {
      ...working,
      [key]: current && value ? { ...current, ...value } : value,
    };
    this.recomputeDirty();
  }

  public setChannel(channel: Protobuf.Channel.Channel): void {
    const next = new Map(this.workingChannels.peek());
    next.set(channel.index, channel);
    this.workingChannels.value = next;
    this.recomputeDirty();
  }

  public reset(): void {
    this.workingRadio.value = this.baselineRadio.peek();
    this.workingModules.value = this.baselineModules.peek();
    this.workingChannels.value = new Map(this.baselineChannels.peek());
    this.workingOwner.value = this.baselineOwner.peek();
    this._stagedAdminMessages.value = new Map();
    this.queuedAdminMessages.value = [];
    this.recomputeDirty();
  }

  /**
   * Send all dirty sections to the device wrapped in a beginEdit/commitEdit
   * pair. Commits run one at a time; edits made during a commit stay dirty
   * for the next one.
   */
  public commit(): Promise<Result<void, Error>> {
    const run = this.commitQueue.then(() => this.runCommit());
    this.commitQueue = run.catch(() => undefined);
    return run;
  }

  private async runCommit(): Promise<Result<void, Error>> {
    if (!this._isDirty.peek()) return Result.ok(undefined);

    // Taken before the first await. Setters replace the working signals, so
    // later edits never reach it.
    const payload = this.collectPayload();
    // An empty transaction makes the radio rewrite its config and report
    // success for nothing.
    if (isEmptyPayload(payload)) return Result.ok(undefined);
    const generation = this.connectionGeneration;

    const beginResult = await beginEditSettings(this.client);
    if (Result.isError(beginResult)) return Result.err(beginResult.error);

    const sendResult = await this.sendPayload(payload);
    if (Result.isError(sendResult)) {
      // There is no abort message. Close the transaction rather than leave it
      // open; everything stays dirty, so the next commit resends it.
      if (generation === this.connectionGeneration) {
        await commitEditSettings(this.client);
      }
      return Result.err(sendResult.error);
    }

    const commitResult = await commitEditSettings(this.client);
    if (Result.isError(commitResult)) return Result.err(commitResult.error);

    // Disconnect already cleared the editor; don't carry this payload into
    // the next connection.
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
    const radioPayload: CommitPayload["radio"] = [];
    for (const variant of this._dirtyRadioSections.peek()) {
      const value = radio[variant];
      if (value !== undefined) radioPayload.push([variant, value]);
    }

    const modules = this.workingModules.peek();
    const modulePayload: CommitPayload["modules"] = [];
    for (const variant of this._dirtyModuleSections.peek()) {
      const value = modules[variant];
      if (value !== undefined) modulePayload.push([variant, value]);
    }

    const channels = this.workingChannels.peek();
    const channelPayload: CommitPayload["channels"] = [];
    for (const index of this._dirtyChannels.peek()) {
      const channel = channels.get(index);
      if (channel) channelPayload.push([index, channel]);
    }

    return {
      radio: radioPayload,
      modules: modulePayload,
      channels: channelPayload,
      owner: this._isOwnerDirty.peek() ? this.workingOwner.peek() : undefined,
      queued: this.queuedAdminMessages.peek(),
      staged: this._stagedAdminMessages.peek(),
    };
  }

  private async sendPayload(
    payload: CommitPayload,
  ): Promise<Result<void, Error>> {
    for (const [variant, value] of payload.radio) {
      const result = await setConfig(
        this.client,
        buildRadioConfig(variant, value),
      );
      if (Result.isError(result)) return Result.err(result.error);
    }

    for (const [variant, value] of payload.modules) {
      const result = await setModuleConfig(
        this.client,
        buildModuleConfig(variant, value),
      );
      if (Result.isError(result)) return Result.err(result.error);
    }

    for (const [, channel] of payload.channels) {
      const result = await setChannel(this.client, channel);
      if (Result.isError(result)) return Result.err(result.error);
    }

    if (payload.owner) {
      const result = await setOwner(this.client, payload.owner);
      if (Result.isError(result)) return Result.err(result.error);
    }

    for (const message of [...payload.queued, ...payload.staged.values()]) {
      const variant = message.payloadVariant;
      if (!variant.case) continue;
      try {
        await sendAdminMessage(this.client, variant);
      } catch (e) {
        return Result.err(e instanceof Error ? e : new Error(String(e)));
      }
    }

    return Result.ok(undefined);
  }

  /**
   * Make only what was sent the new baseline. Other sections keep theirs,
   * including device packets that arrived during the commit.
   */
  private reconcileAfterCommit(payload: CommitPayload): void {
    if (payload.radio.length > 0) {
      const baseline: Record<string, unknown> = {
        ...this.baselineRadio.peek(),
      };
      for (const [variant, value] of payload.radio) baseline[variant] = value;
      this.baselineRadio.value = baseline as RadioConfig;
    }

    if (payload.modules.length > 0) {
      const baseline: Record<string, unknown> = {
        ...this.baselineModules.peek(),
      };
      for (const [variant, value] of payload.modules) baseline[variant] = value;
      this.baselineModules.value = baseline as ModuleConfig;
    }

    if (payload.channels.length > 0) {
      const baseline = new Map(this.baselineChannels.peek());
      for (const [index, channel] of payload.channels) {
        baseline.set(index, channel);
      }
      this.baselineChannels.value = baseline;
    }

    if (payload.owner) this.baselineOwner.value = payload.owner;

    // One entry per message sent: the same object may have been queued again
    // during the commit, and that copy hasn't been sent.
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
    const radioDirty: RadioConfigSection[] = [];
    const radioKeys = new Set<string>([
      ...Object.keys(radioBase),
      ...Object.keys(radioWorking),
    ]);
    for (const key of radioKeys) {
      if (
        !shallowEqual(
          radioBase[key as keyof RadioConfig],
          radioWorking[key as keyof RadioConfig],
        )
      ) {
        radioDirty.push(key as RadioConfigSection);
      }
    }

    const moduleBase = this.baselineModules.peek();
    const moduleWorking = this.workingModules.peek();
    const moduleDirty: ModuleConfigSection[] = [];
    const moduleKeys = new Set<string>([
      ...Object.keys(moduleBase),
      ...Object.keys(moduleWorking),
    ]);
    for (const key of moduleKeys) {
      if (
        !shallowEqual(
          moduleBase[key as keyof ModuleConfig],
          moduleWorking[key as keyof ModuleConfig],
        )
      ) {
        moduleDirty.push(key as ModuleConfigSection);
      }
    }

    const channelDirty: number[] = [];
    const channelBase = this.baselineChannels.peek();
    const channelWorking = this.workingChannels.peek();
    const channelKeys = new Set<number>([
      ...channelBase.keys(),
      ...channelWorking.keys(),
    ]);
    for (const idx of channelKeys) {
      if (!shallowEqual(channelBase.get(idx), channelWorking.get(idx))) {
        channelDirty.push(idx);
      }
    }

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
  radio: [RadioConfigSection, NonNullable<RadioConfig[RadioConfigSection]>][];
  modules: [
    ModuleConfigSection,
    NonNullable<ModuleConfig[ModuleConfigSection]>,
  ][];
  channels: [number, Protobuf.Channel.Channel][];
  /** Set only when the owner was dirty. */
  owner: Protobuf.Mesh.User | undefined;
  queued: readonly Protobuf.Admin.AdminMessage[];
  staged: ReadonlyMap<string, Protobuf.Admin.AdminMessage>;
}

function isEmptyPayload(payload: CommitPayload): boolean {
  return (
    payload.radio.length === 0 &&
    payload.modules.length === 0 &&
    payload.channels.length === 0 &&
    payload.owner === undefined &&
    payload.queued.length === 0 &&
    payload.staged.size === 0
  );
}

function buildRadioConfig(
  variant: RadioConfigSection,
  value: unknown,
): Protobuf.Config.Config {
  return create(Protobuf.Config.ConfigSchema, {
    payloadVariant: {
      case: variant,
      value,
    } as Protobuf.Config.Config["payloadVariant"],
  });
}

function buildModuleConfig(
  variant: ModuleConfigSection,
  value: unknown,
): Protobuf.ModuleConfig.ModuleConfig {
  return create(Protobuf.ModuleConfig.ModuleConfigSchema, {
    payloadVariant: {
      case: variant,
      value,
    } as Protobuf.ModuleConfig.ModuleConfig["payloadVariant"],
  });
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  if (a === null || b === null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const aKeys = Object.keys(ao);
  const bKeys = Object.keys(bo);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    const av = ao[k];
    const bv = bo[k];
    if (av === bv) continue;
    if (typeof av === "object" && typeof bv === "object") {
      if (!shallowEqual(av, bv)) return false;
    } else {
      return false;
    }
  }
  return true;
}
