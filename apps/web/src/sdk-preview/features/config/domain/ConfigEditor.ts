import { Types } from "@meshtastic/core";
import { signal } from "@preact/signals-core";
import { Result } from "better-result";
import type { ResultType } from "better-result";
import type { MeshClientPort } from "../../../core/client/MeshClientPort.ts";
import type { MeshError } from "../../../core/errors/MeshError.ts";
import {
  type ReadonlySignal,
  toReadonly,
} from "../../../core/signals/index.ts";
import {
  beginEditSettings,
  commitEditSettings,
  setConfig,
  setModuleConfig,
} from "../application/ConfigUseCases.ts";
import {
  buildModuleConfig,
  buildRadioConfig,
} from "../infrastructure/configBuilders.ts";
import { configValuesEqual } from "./configEquality.ts";
import { mergeStagedValue } from "./configMerge.ts";
import { ConfigMapper } from "../infrastructure/ConfigMapper.ts";
import type { ModuleConfig, ModuleConfigSection } from "./ModuleConfig.ts";
import type { RadioConfig, RadioConfigSection } from "./RadioConfig.ts";

/**
 * Per-section editor for radio config + module config — a faithful, scoped port
 * of `@meshtastic/sdk`'s `ConfigEditor` (PR #1050). Demonstrates the pattern
 * that replaces the current Zustand `changeRegistry`:
 *
 * - **Baseline**: what the device most recently sent. Updated automatically from
 *   `onConfigPacket` / `onModuleConfigPacket`, and re-applied as post-commit truth.
 * - **Working copy**: UI edits via `setRadioSection` / `setModuleSection`.
 *   Mid-edit baseline updates do NOT clobber a section the user is editing.
 * - On disconnect both reset, so a stale working copy can't leak across reconnects.
 *
 * All state is exposed as `ReadonlySignal`s; React binds via `useSignal`.
 */
export class ConfigEditor {
  private readonly client: MeshClientPort;

  private readonly baselineRadio = signal<RadioConfig>({});
  private readonly baselineModules = signal<ModuleConfig>({});
  private readonly workingRadio = signal<RadioConfig>({});
  private readonly workingModules = signal<ModuleConfig>({});
  private readonly _dirtyRadioSections = signal<readonly RadioConfigSection[]>(
    [],
  );
  private readonly _dirtyModuleSections = signal<
    readonly ModuleConfigSection[]
  >([]);
  private readonly _isDirty = signal<boolean>(false);

  public readonly radio: ReadonlySignal<RadioConfig> = toReadonly(
    this.workingRadio,
  );
  public readonly modules: ReadonlySignal<ModuleConfig> = toReadonly(
    this.workingModules,
  );
  public readonly dirtyRadioSections: ReadonlySignal<
    readonly RadioConfigSection[]
  > = toReadonly(this._dirtyRadioSections);
  public readonly dirtyModuleSections: ReadonlySignal<
    readonly ModuleConfigSection[]
  > = toReadonly(this._dirtyModuleSections);
  public readonly isDirty: ReadonlySignal<boolean> = toReadonly(this._isDirty);

  constructor(client: MeshClientPort) {
    this.client = client;

    client.events.onConfigPacket.subscribe((config) => {
      const next = ConfigMapper.mergeRadio(this.baselineRadio.peek(), config);
      this.baselineRadio.value = next;
      const variant = config.payloadVariant.case;
      if (variant) {
        // Apply the baseline update to the working copy only if the user hasn't
        // already edited this section — their in-flight edit wins.
        if (!this._dirtyRadioSections.peek().includes(variant)) {
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
        if (!this._dirtyModuleSections.peek().includes(variant)) {
          this.workingModules.value = {
            ...this.workingModules.peek(),
            [variant]: next[variant],
          };
        }
      }
      this.recomputeDirty();
    });

    client.events.onDeviceStatus.subscribe((status) => {
      if (status === Types.DeviceStatusEnum.DeviceDisconnected) {
        this.baselineRadio.value = {};
        this.baselineModules.value = {};
        this.workingRadio.value = {};
        this.workingModules.value = {};
        this._dirtyRadioSections.value = [];
        this._dirtyModuleSections.value = [];
        this._isDirty.value = false;
      }
    });
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

  /** Discard all working edits, snapping back to the device's baseline. */
  public reset(): void {
    this.workingRadio.value = this.baselineRadio.peek();
    this.workingModules.value = this.baselineModules.peek();
    this.recomputeDirty();
  }

  /**
   * Send every dirty section to the device inside a beginEdit/commitEdit pair.
   *
   * The payload is frozen synchronously before the first `await`, and on
   * success only the sections that were actually transmitted are promoted into
   * the baseline. Edits staged while the transaction was in flight stay dirty
   * and go out on the next commit instead of being silently marked as saved.
   * Any failure aborts and returns the error — the baseline is left untouched.
   */
  public async commit(): Promise<ResultType<void, MeshError>> {
    if (!this._isDirty.peek()) {
      return Result.ok(undefined);
    }

    const radio = this.workingRadio.peek();
    const radioPayload: Array<
      [RadioConfigSection, NonNullable<RadioConfig[RadioConfigSection]>]
    > = [];
    for (const section of this._dirtyRadioSections.peek()) {
      const value = radio[section];
      if (value === undefined) {
        continue;
      }
      radioPayload.push([section, value]);
    }

    const modules = this.workingModules.peek();
    const modulePayload: Array<
      [ModuleConfigSection, NonNullable<ModuleConfig[ModuleConfigSection]>]
    > = [];
    for (const section of this._dirtyModuleSections.peek()) {
      const value = modules[section];
      if (value === undefined) {
        continue;
      }
      modulePayload.push([section, value]);
    }

    if (radioPayload.length === 0 && modulePayload.length === 0) {
      // An empty begin/commit pair makes the device rewrite its config
      // unchanged and report success — a "save" that saved nothing.
      return Result.ok(undefined);
    }

    const begin = await beginEditSettings(this.client);
    if (Result.isError(begin)) {
      return Result.err(begin.error);
    }

    for (const [section, value] of radioPayload) {
      const result = await setConfig(
        this.client,
        buildRadioConfig(section, value),
      );
      if (Result.isError(result)) {
        return Result.err(result.error);
      }
    }

    for (const [section, value] of modulePayload) {
      const result = await setModuleConfig(
        this.client,
        buildModuleConfig(section, value),
      );
      if (Result.isError(result)) {
        return Result.err(result.error);
      }
    }

    const commit = await commitEditSettings(this.client);
    if (Result.isError(commit)) {
      return Result.err(commit.error);
    }

    // Promote only what went on the wire, and only where the working copy is
    // still the exact object we transmitted (setters always replace the whole
    // section, so reference identity is an exact "untouched since" test).
    if (radioPayload.length > 0) {
      const current = this.workingRadio.peek();
      const baseline: Record<string, unknown> = {
        ...this.baselineRadio.peek(),
      };
      for (const [section, value] of radioPayload) {
        if (current[section] === value) {
          baseline[section] = value;
        }
      }
      this.baselineRadio.value = baseline as RadioConfig;
    }
    if (modulePayload.length > 0) {
      const current = this.workingModules.peek();
      const baseline: Record<string, unknown> = {
        ...this.baselineModules.peek(),
      };
      for (const [section, value] of modulePayload) {
        if (current[section] === value) {
          baseline[section] = value;
        }
      }
      this.baselineModules.value = baseline as ModuleConfig;
    }

    // Recompute instead of blanket-clearing, so anything staged mid-flight
    // stays flagged as pending.
    this.recomputeDirty();
    return Result.ok(undefined);
  }

  private recomputeDirty(): void {
    const radioBase = this.baselineRadio.peek();
    const radioWorking = this.workingRadio.peek();
    const radioDirty: RadioConfigSection[] = [];
    for (const key of new Set<string>([
      ...Object.keys(radioBase),
      ...Object.keys(radioWorking),
    ])) {
      const section = key as RadioConfigSection;
      if (!configValuesEqual(radioBase[section], radioWorking[section])) {
        radioDirty.push(section);
      }
    }

    const moduleBase = this.baselineModules.peek();
    const moduleWorking = this.workingModules.peek();
    const moduleDirty: ModuleConfigSection[] = [];
    for (const key of new Set<string>([
      ...Object.keys(moduleBase),
      ...Object.keys(moduleWorking),
    ])) {
      const section = key as ModuleConfigSection;
      if (!configValuesEqual(moduleBase[section], moduleWorking[section])) {
        moduleDirty.push(section);
      }
    }

    this._dirtyRadioSections.value = radioDirty;
    this._dirtyModuleSections.value = moduleDirty;
    this._isDirty.value = radioDirty.length > 0 || moduleDirty.length > 0;
  }
}
