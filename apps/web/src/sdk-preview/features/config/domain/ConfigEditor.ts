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

  /** Discard all working edits, snapping back to the device's baseline. */
  public reset(): void {
    this.workingRadio.value = this.baselineRadio.peek();
    this.workingModules.value = this.baselineModules.peek();
    this.recomputeDirty();
  }

  /**
   * Send every dirty section to the device inside a beginEdit/commitEdit pair.
   * On success the baseline is replaced with the working copy (optimistic);
   * inbound config packets after commit reconcile. Any failure aborts and
   * returns the error — the baseline is left untouched.
   */
  public async commit(): Promise<ResultType<void, MeshError>> {
    if (!this._isDirty.peek()) {
      return Result.ok(undefined);
    }

    const begin = await beginEditSettings(this.client);
    if (Result.isError(begin)) {
      return Result.err(begin.error);
    }

    const radio = this.workingRadio.peek();
    for (const section of this._dirtyRadioSections.peek()) {
      const value = radio[section];
      if (value === undefined) {
        continue;
      }
      const result = await setConfig(
        this.client,
        buildRadioConfig(section, value),
      );
      if (Result.isError(result)) {
        return Result.err(result.error);
      }
    }

    const modules = this.workingModules.peek();
    for (const section of this._dirtyModuleSections.peek()) {
      const value = modules[section];
      if (value === undefined) {
        continue;
      }
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

    this.baselineRadio.value = this.workingRadio.peek();
    this.baselineModules.value = this.workingModules.peek();
    this._dirtyRadioSections.value = [];
    this._dirtyModuleSections.value = [];
    this._isDirty.value = false;
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
      if (!shallowEqual(radioBase[section], radioWorking[section])) {
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
      if (!shallowEqual(moduleBase[section], moduleWorking[section])) {
        moduleDirty.push(section);
      }
    }

    this._dirtyRadioSections.value = radioDirty;
    this._dirtyModuleSections.value = moduleDirty;
    this._isDirty.value = radioDirty.length > 0 || moduleDirty.length > 0;
  }
}

/** Recursive value-equality used for dirty detection (matches the SDK helper). */
function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (a === undefined || b === undefined || a === null || b === null) {
    return false;
  }
  if (typeof a !== "object" || typeof b !== "object") {
    return false;
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const aKeys = Object.keys(ao);
  const bKeys = Object.keys(bo);
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  for (const k of aKeys) {
    const av = ao[k];
    const bv = bo[k];
    if (av === bv) {
      continue;
    }
    if (typeof av === "object" && typeof bv === "object") {
      if (!shallowEqual(av, bv)) {
        return false;
      }
    } else {
      return false;
    }
  }
  return true;
}
