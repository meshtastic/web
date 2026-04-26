import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { signal } from "@preact/signals-core";
import { Result } from "better-result";
import type { ResultType } from "better-result";
import type { MeshClient } from "../../../core/client/MeshClient.ts";
import { type ReadonlySignal, toReadonly } from "../../../core/signals/createStore.ts";
import { setChannel } from "../../channels/application/ChannelUseCases.ts";
import { DeviceStatusEnum } from "../../device/domain/DeviceStatus.ts";
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
  private readonly baselineChannels = signal<ReadonlyMap<number, Protobuf.Channel.Channel>>(
    new Map(),
  );
  private readonly workingRadio = signal<RadioConfig>({});
  private readonly workingModules = signal<ModuleConfig>({});
  private readonly workingChannels = signal<ReadonlyMap<number, Protobuf.Channel.Channel>>(
    new Map(),
  );
  private readonly _dirtyRadioSections = signal<readonly RadioConfigSection[]>([]);
  private readonly _dirtyModuleSections = signal<readonly ModuleConfigSection[]>([]);
  private readonly _dirtyChannels = signal<readonly number[]>([]);
  private readonly _isDirty = signal<boolean>(false);

  public readonly radio: ReadonlySignal<RadioConfig> = toReadonly(this.workingRadio);
  public readonly modules: ReadonlySignal<ModuleConfig> = toReadonly(this.workingModules);
  public readonly channels: ReadonlySignal<ReadonlyMap<number, Protobuf.Channel.Channel>> =
    toReadonly(this.workingChannels);
  public readonly dirtyRadioSections: ReadonlySignal<readonly RadioConfigSection[]> = toReadonly(
    this._dirtyRadioSections,
  );
  public readonly dirtyModuleSections: ReadonlySignal<readonly ModuleConfigSection[]> = toReadonly(
    this._dirtyModuleSections,
  );
  public readonly dirtyChannels: ReadonlySignal<readonly number[]> = toReadonly(
    this._dirtyChannels,
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
          this.workingRadio.value = { ...this.workingRadio.peek(), [variant]: next[variant] };
        }
      }
      this.recomputeDirty();
    });

    client.events.onModuleConfigPacket.subscribe((moduleConfig) => {
      const next = ConfigMapper.mergeModule(this.baselineModules.peek(), moduleConfig);
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
        this.workingRadio.value = {};
        this.workingModules.value = {};
        this.workingChannels.value = new Map();
        this._dirtyRadioSections.value = [];
        this._dirtyModuleSections.value = [];
        this._dirtyChannels.value = [];
        this._isDirty.value = false;
      }
    });
  }

  public setRadioSection<K extends RadioConfigSection & string>(
    key: K,
    value: RadioConfig[K],
  ): void {
    this.workingRadio.value = { ...this.workingRadio.peek(), [key]: value };
    this.recomputeDirty();
  }

  public setModuleSection<K extends ModuleConfigSection & string>(
    key: K,
    value: ModuleConfig[K],
  ): void {
    this.workingModules.value = { ...this.workingModules.peek(), [key]: value };
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
    this.recomputeDirty();
  }

  /**
   * Send all dirty sections to the device wrapped in a beginEdit/commitEdit
   * pair. On success the baseline is replaced with the working copy
   * (optimistic update); inbound config packets after commit will reconcile.
   */
  public async commit(): Promise<ResultType<void, Error>> {
    if (!this._isDirty.peek()) return Result.ok(undefined);

    const beginResult = await beginEditSettings(this.client);
    if (Result.isError(beginResult)) return Result.err(beginResult.error);

    const radio = this.workingRadio.peek();
    for (const variant of this._dirtyRadioSections.peek()) {
      const value = radio[variant];
      if (value === undefined) continue;
      const config = buildRadioConfig(variant, value);
      const result = await setConfig(this.client, config);
      if (Result.isError(result)) return Result.err(result.error);
    }

    const modules = this.workingModules.peek();
    for (const variant of this._dirtyModuleSections.peek()) {
      const value = modules[variant];
      if (value === undefined) continue;
      const moduleConfig = buildModuleConfig(variant, value);
      const result = await setModuleConfig(this.client, moduleConfig);
      if (Result.isError(result)) return Result.err(result.error);
    }

    const channels = this.workingChannels.peek();
    for (const index of this._dirtyChannels.peek()) {
      const channel = channels.get(index);
      if (!channel) continue;
      const result = await setChannel(this.client, channel);
      if (Result.isError(result)) return Result.err(result.error);
    }

    const commitResult = await commitEditSettings(this.client);
    if (Result.isError(commitResult)) return Result.err(commitResult.error);

    this.baselineRadio.value = this.workingRadio.peek();
    this.baselineModules.value = this.workingModules.peek();
    this.baselineChannels.value = new Map(this.workingChannels.peek());
    this._dirtyRadioSections.value = [];
    this._dirtyModuleSections.value = [];
    this._dirtyChannels.value = [];
    this._isDirty.value = false;

    return Result.ok(undefined);
  }

  private recomputeDirty(): void {
    const radioBase = this.baselineRadio.peek();
    const radioWorking = this.workingRadio.peek();
    const radioDirty: RadioConfigSection[] = [];
    const radioKeys = new Set<string>([...Object.keys(radioBase), ...Object.keys(radioWorking)]);
    for (const key of radioKeys) {
      if (
        !shallowEqual(radioBase[key as keyof RadioConfig], radioWorking[key as keyof RadioConfig])
      ) {
        radioDirty.push(key as RadioConfigSection);
      }
    }

    const moduleBase = this.baselineModules.peek();
    const moduleWorking = this.workingModules.peek();
    const moduleDirty: ModuleConfigSection[] = [];
    const moduleKeys = new Set<string>([...Object.keys(moduleBase), ...Object.keys(moduleWorking)]);
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
    const channelKeys = new Set<number>([...channelBase.keys(), ...channelWorking.keys()]);
    for (const idx of channelKeys) {
      if (!shallowEqual(channelBase.get(idx), channelWorking.get(idx))) {
        channelDirty.push(idx);
      }
    }

    this._dirtyRadioSections.value = radioDirty;
    this._dirtyModuleSections.value = moduleDirty;
    this._dirtyChannels.value = channelDirty;
    this._isDirty.value =
      radioDirty.length > 0 || moduleDirty.length > 0 || channelDirty.length > 0;
  }
}

function buildRadioConfig(variant: RadioConfigSection, value: unknown): Protobuf.Config.Config {
  return create(Protobuf.Config.ConfigSchema, {
    payloadVariant: { case: variant, value } as Protobuf.Config.Config["payloadVariant"],
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
