import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { signal } from "@preact/signals-core";
import { Result } from "better-result";
import type { ResultType } from "better-result";
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
import { configValuesEqual } from "./configEquality.ts";
import { mergeStagedValue } from "./configMerge.ts";
import type { ModuleConfig, ModuleConfigSection } from "./ModuleConfig.ts";
import type { RadioConfig, RadioConfigSection } from "./RadioConfig.ts";

/**
 * Everything a single `commit()` will actually put on the wire, captured
 * before the first `await` so later staging cannot silently join (or be
 * mistaken for part of) the transaction.
 */
interface CommitPayload {
  radio: Array<
    [RadioConfigSection, NonNullable<RadioConfig[RadioConfigSection]>]
  >;
  modules: Array<
    [ModuleConfigSection, NonNullable<ModuleConfig[ModuleConfigSection]>]
  >;
  channels: Array<[number, Protobuf.Channel.Channel]>;
  owner: Protobuf.Mesh.User | undefined;
  adminMessages: readonly Protobuf.Admin.AdminMessage[];
}

function isEmptyPayload(payload: CommitPayload): boolean {
  return (
    payload.radio.length === 0 &&
    payload.modules.length === 0 &&
    payload.channels.length === 0 &&
    payload.owner === undefined &&
    payload.adminMessages.length === 0
  );
}

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

  constructor(client: MeshClient) {
    this.client = client;

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
        this.baselineRadio.value = {};
        this.baselineModules.value = {};
        this.baselineChannels.value = new Map();
        this.baselineOwner.value = undefined;
        this.workingRadio.value = {};
        this.workingModules.value = {};
        this.workingChannels.value = new Map();
        this.workingOwner.value = undefined;
        this.queuedAdminMessages.value = [];
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
    this.workingOwner.value = mergeStagedValue(
      this.baselineOwner.peek(),
      owner,
    );
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

  public setRadioSection<K extends RadioConfigSection & string>(
    key: K,
    value: RadioConfig[K],
  ): void {
    // Forms stage the output of their Zod resolver, which drops every field
    // the form does not declare. Merge over the device's value so those
    // fields are not silently reset to their protobuf defaults on commit.
    const merged = mergeStagedValue(this.baselineRadio.peek()[key], value);
    this.workingRadio.value = { ...this.workingRadio.peek(), [key]: merged };
    this.recomputeDirty();
  }

  public setModuleSection<K extends ModuleConfigSection & string>(
    key: K,
    value: ModuleConfig[K],
  ): void {
    const merged = mergeStagedValue(this.baselineModules.peek()[key], value);
    this.workingModules.value = {
      ...this.workingModules.peek(),
      [key]: merged,
    };
    this.recomputeDirty();
  }

  public setChannel(channel: Protobuf.Channel.Channel): void {
    const merged = mergeStagedValue(
      this.baselineChannels.peek().get(channel.index),
      channel,
    );
    const next = new Map(this.workingChannels.peek());
    next.set(merged.index, merged);
    this.workingChannels.value = next;
    this.recomputeDirty();
  }

  public reset(): void {
    this.workingRadio.value = this.baselineRadio.peek();
    this.workingModules.value = this.baselineModules.peek();
    this.workingChannels.value = new Map(this.baselineChannels.peek());
    this.workingOwner.value = this.baselineOwner.peek();
    this.recomputeDirty();
  }

  /**
   * Snapshot of everything the *next* commit would transmit, taken
   * synchronously so it cannot drift while the transaction is in flight.
   *
   * A dirty section with no working value is deliberately left out: it cannot
   * be transmitted, so it must also not be treated as synced afterwards.
   */
  private collectPayload(): CommitPayload {
    const radio = this.workingRadio.peek();
    const radioPayload: CommitPayload["radio"] = [];
    for (const variant of this._dirtyRadioSections.peek()) {
      const value = radio[variant];
      if (value === undefined) continue;
      radioPayload.push([variant, value]);
    }

    const modules = this.workingModules.peek();
    const modulePayload: CommitPayload["modules"] = [];
    for (const variant of this._dirtyModuleSections.peek()) {
      const value = modules[variant];
      if (value === undefined) continue;
      modulePayload.push([variant, value]);
    }

    const channels = this.workingChannels.peek();
    const channelPayload: CommitPayload["channels"] = [];
    for (const index of this._dirtyChannels.peek()) {
      const channel = channels.get(index);
      if (!channel) continue;
      channelPayload.push([index, channel]);
    }

    const owner = this._isOwnerDirty.peek()
      ? this.workingOwner.peek()
      : undefined;

    return {
      radio: radioPayload,
      modules: modulePayload,
      channels: channelPayload,
      owner,
      adminMessages: this.queuedAdminMessages.peek().slice(),
    };
  }

  /**
   * Promote exactly the values that were transmitted into the baseline.
   *
   * Every setter replaces the section object wholesale, so reference identity
   * is an exact test for "the user has not touched this since we sent it". A
   * section that was re-staged mid-flight (or was never part of the payload at
   * all) keeps its old baseline and therefore stays dirty, so the edit goes
   * out on the next commit instead of being silently discarded.
   */
  private reconcileAfterCommit(payload: CommitPayload): void {
    if (payload.radio.length > 0) {
      const current = this.workingRadio.peek();
      const baseline: Record<string, unknown> = {
        ...this.baselineRadio.peek(),
      };
      for (const [variant, value] of payload.radio) {
        if (current[variant] === value) baseline[variant] = value;
      }
      this.baselineRadio.value = baseline as RadioConfig;
    }

    if (payload.modules.length > 0) {
      const current = this.workingModules.peek();
      const baseline: Record<string, unknown> = {
        ...this.baselineModules.peek(),
      };
      for (const [variant, value] of payload.modules) {
        if (current[variant] === value) baseline[variant] = value;
      }
      this.baselineModules.value = baseline as ModuleConfig;
    }

    if (payload.channels.length > 0) {
      const current = this.workingChannels.peek();
      const baseline = new Map(this.baselineChannels.peek());
      for (const [index, channel] of payload.channels) {
        if (current.get(index) === channel) baseline.set(index, channel);
      }
      this.baselineChannels.value = baseline;
    }

    if (
      payload.owner !== undefined &&
      this.workingOwner.peek() === payload.owner
    ) {
      this.baselineOwner.value = payload.owner;
    }

    if (payload.adminMessages.length > 0) {
      const sent = new Set(payload.adminMessages);
      this.queuedAdminMessages.value = this.queuedAdminMessages
        .peek()
        .filter((message) => !sent.has(message));
    }

    // Recompute rather than blanket-clearing: anything staged while the
    // transaction was in flight still differs from the baseline and stays
    // flagged as pending.
    this.recomputeDirty();
  }

  /**
   * Send all dirty sections to the device wrapped in a beginEdit/commitEdit
   * pair. On success only the sections that were actually transmitted are
   * promoted into the baseline; edits staged while the commit was in flight
   * remain dirty and go out on the next commit.
   */
  public async commit(): Promise<ResultType<void, Error>> {
    if (!this._isDirty.peek()) return Result.ok(undefined);

    // Freeze what this transaction carries before the first await.
    const payload = this.collectPayload();
    if (isEmptyPayload(payload)) {
      // Opening a beginEdit/commitEdit pair with nothing inside makes the
      // device rewrite its config file unchanged and report success — the
      // firmware-side signature of a "saved" change that was never sent.
      return Result.ok(undefined);
    }

    const beginResult = await beginEditSettings(this.client);
    if (Result.isError(beginResult)) return Result.err(beginResult.error);

    for (const [variant, value] of payload.radio) {
      const config = buildRadioConfig(variant, value);
      const result = await setConfig(this.client, config);
      if (Result.isError(result)) return Result.err(result.error);
    }

    for (const [variant, value] of payload.modules) {
      const moduleConfig = buildModuleConfig(variant, value);
      const result = await setModuleConfig(this.client, moduleConfig);
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

    for (const message of payload.adminMessages) {
      const variant = message.payloadVariant;
      if (!variant.case) continue;
      try {
        await sendAdminMessage(this.client, variant);
      } catch (e) {
        return Result.err(e instanceof Error ? e : new Error(String(e)));
      }
    }

    const commitResult = await commitEditSettings(this.client);
    if (Result.isError(commitResult)) return Result.err(commitResult.error);

    this.reconcileAfterCommit(payload);

    return Result.ok(undefined);
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
        !configValuesEqual(
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
        !configValuesEqual(
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
      if (!configValuesEqual(channelBase.get(idx), channelWorking.get(idx))) {
        channelDirty.push(idx);
      }
    }

    const ownerDirty = !configValuesEqual(
      this.baselineOwner.peek(),
      this.workingOwner.peek(),
    );
    const hasQueuedAdmin = this.queuedAdminMessages.peek().length > 0;

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
