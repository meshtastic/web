import { create } from "@bufbuild/protobuf";
import { Protobuf, Types } from "@core/protobuf.ts";
import { type FirmwareSupport, firmwareSupport } from "@core/utils/firmware.ts";
import type { ConnectionStateJs } from "@meshtastic/sdk-kmp";
import { computed, signal } from "@preact/signals-core";
import { Result } from "better-result";
import { type ReadonlySignal, toReadonly } from "./signals.ts";

export const DEFAULT_UNLOCK_BOOTS = 50;

export interface UnlockOptions {
  passphrase: string;
  /** Reboots the unlock survives. Defaults to {@link DEFAULT_UNLOCK_BOOTS}. */
  bootsRemaining?: number;
  /** Hours until the unlock expires; 0 or unset means no time limit. */
  validForHours?: number;
  /** Per-boot session cap in seconds; 0 or unset means unlimited. */
  maxSessionSeconds?: number;
}

const LOCKED_STATES = new Set([
  Protobuf.Mesh.LockdownStatus_State.NEEDS_PROVISION,
  Protobuf.Mesh.LockdownStatus_State.LOCKED,
  Protobuf.Mesh.LockdownStatus_State.UNLOCK_FAILED,
]);

/** True while the device withholds its config until the client unlocks it. */
export const isLockedState = (
  status: Protobuf.Mesh.LockdownStatus | undefined,
): boolean => !!status && LOCKED_STATES.has(status.state);

export function toDeviceStatus(
  state: ConnectionStateJs,
): Types.DeviceStatusEnum {
  switch (state.kind) {
    case "connecting":
      return Types.DeviceStatusEnum.DeviceConnecting;
    case "configuring":
      return Types.DeviceStatusEnum.DeviceConfiguring;
    case "connected":
      return Types.DeviceStatusEnum.DeviceConfigured;
    case "reconnecting":
      return Types.DeviceStatusEnum.DeviceReconnecting;
    default:
      return Types.DeviceStatusEnum.DeviceDisconnected;
  }
}

export interface DeviceAdmin {
  sendAdmin(
    variant: Protobuf.Admin.AdminMessage["payloadVariant"],
  ): Promise<Result<unknown, Error>>;
  /** Runs the handshake again, e.g. after the device was unlocked. */
  rehandshake(): Promise<void>;
  warn(message: string, ...args: unknown[]): void;
}

/**
 * The connected device: its status, identity, metadata, lockdown state and
 * the admin commands that act on it as a whole.
 */
export class DeviceClient {
  private readonly statusStore = signal(
    Types.DeviceStatusEnum.DeviceDisconnected,
  );
  private readonly configuredStore = signal(false);
  private readonly pendingStore = signal(false);
  private readonly myNodeNumStore = signal<number | undefined>(undefined);
  private readonly metadataStore = signal<
    Protobuf.Mesh.DeviceMetadata | undefined
  >(undefined);
  private readonly myNodeInfoStore = signal<
    Protobuf.Mesh.MyNodeInfo | undefined
  >(undefined);
  private readonly supportStore = signal<FirmwareSupport>("unknown");
  private readonly lockdownStore = signal<
    Protobuf.Mesh.LockdownStatus | undefined
  >(undefined);
  private readonly presetsStore = signal<
    Protobuf.Mesh.LoRaRegionPresetMap | undefined
  >(undefined);
  private unlockPending = false;

  readonly status: ReadonlySignal<Types.DeviceStatusEnum>;
  readonly isConfigured: ReadonlySignal<boolean>;
  readonly pendingSettingsChanges: ReadonlySignal<boolean>;
  readonly myNodeNum: ReadonlySignal<number | undefined>;
  readonly metadata: ReadonlySignal<Protobuf.Mesh.DeviceMetadata | undefined>;
  readonly myNodeInfo: ReadonlySignal<Protobuf.Mesh.MyNodeInfo | undefined>;
  readonly firmwareSupport: ReadonlySignal<FirmwareSupport>;
  readonly lockdownStatus: ReadonlySignal<
    Protobuf.Mesh.LockdownStatus | undefined
  >;
  readonly isLocked: ReadonlySignal<boolean>;
  readonly regionPresets: ReadonlySignal<
    Protobuf.Mesh.LoRaRegionPresetMap | undefined
  >;

  constructor(private readonly admin: DeviceAdmin) {
    this.status = toReadonly(this.statusStore);
    this.isConfigured = toReadonly(this.configuredStore);
    this.pendingSettingsChanges = toReadonly(this.pendingStore);
    this.myNodeNum = toReadonly(this.myNodeNumStore);
    this.metadata = toReadonly(this.metadataStore);
    this.myNodeInfo = toReadonly(this.myNodeInfoStore);
    this.firmwareSupport = toReadonly(this.supportStore);
    this.lockdownStatus = toReadonly(this.lockdownStore);
    this.regionPresets = toReadonly(this.presetsStore);
    this.isLocked = toReadonly(
      computed(() => isLockedState(this.lockdownStore.value)),
    );
  }

  applyConnectionState(state: ConnectionStateJs): void {
    const status = toDeviceStatus(state);
    this.statusStore.value = status;
    if (status === Types.DeviceStatusEnum.DeviceConfigured) {
      this.configuredStore.value = true;
    } else if (status === Types.DeviceStatusEnum.DeviceConfiguring) {
      this.configuredStore.value = false;
    } else if (status === Types.DeviceStatusEnum.DeviceDisconnected) {
      this.configuredStore.value = false;
      this.unlockPending = false;
      this.lockdownStore.value = undefined;
    }
  }

  /** Names the local node from the SDK's state when no `my_info` frame did. */
  applyMyNodeNum(myNodeNum: number): void {
    if (this.myNodeNumStore.peek() === undefined) {
      this.myNodeNumStore.value = myNodeNum;
    }
  }

  applyMyNodeInfo(info: Protobuf.Mesh.MyNodeInfo): void {
    this.myNodeInfoStore.value = info;
    this.myNodeNumStore.value = info.myNodeNum;
  }

  applyMetadata(metadata: Protobuf.Mesh.DeviceMetadata): void {
    this.metadataStore.value = metadata;
    this.supportStore.value = firmwareSupport(metadata.firmwareVersion);
  }

  applyLockdownStatus(status: Protobuf.Mesh.LockdownStatus): void {
    const wasLocked = isLockedState(this.lockdownStore.peek());
    this.lockdownStore.value = status;
    // After an unlock the device only releases its config to a new
    // handshake on the same link; run one when this session saw it locked
    // or sent a passphrase, so a repeated UNLOCKED can't loop.
    if (
      status.state === Protobuf.Mesh.LockdownStatus_State.UNLOCKED &&
      (wasLocked || this.unlockPending)
    ) {
      this.unlockPending = false;
      this.admin.rehandshake().catch((e: unknown) => {
        this.admin.warn("Handshake after unlock failed", e);
      });
    } else if (isLockedState(status)) {
      this.unlockPending = false;
    }
  }

  applyRegionPresets(presets: Protobuf.Mesh.LoRaRegionPresetMap): void {
    this.presetsStore.value = presets;
  }

  setPendingSettingsChanges(pending: boolean): void {
    this.pendingStore.value = pending;
  }

  private lockdownAuth(
    auth: Parameters<
      typeof create<typeof Protobuf.Admin.LockdownAuthSchema>
    >[1],
  ): Promise<void> {
    return this.admin
      .sendAdmin({
        case: "lockdownAuth",
        value: create(Protobuf.Admin.LockdownAuthSchema, auth),
      })
      .then((result) => {
        if (Result.isError(result)) throw result.error;
      });
  }

  /** Sends the lockdown passphrase; the result arrives on `lockdownStatus`. */
  unlock(options: UnlockOptions): Promise<void> {
    this.unlockPending = true;
    const hours = options.validForHours ?? 0;
    return this.lockdownAuth({
      passphrase: new TextEncoder().encode(options.passphrase),
      bootsRemaining: Math.max(
        0,
        options.bootsRemaining ?? DEFAULT_UNLOCK_BOOTS,
      ),
      validUntilEpoch:
        hours > 0 ? Math.floor(Date.now() / 1000) + hours * 3600 : 0,
      maxSessionSeconds: Math.max(0, options.maxSessionSeconds ?? 0),
    });
  }

  lockNow(): Promise<void> {
    return this.lockdownAuth({ lockNow: true });
  }

  /** Turns lockdown off for good: the device decrypts its storage and reboots. */
  disableLockdown(passphrase: string): Promise<void> {
    return this.lockdownAuth({
      passphrase: new TextEncoder().encode(passphrase),
      disable: true,
    });
  }

  reboot(seconds = 0): Promise<Result<unknown, Error>> {
    return this.admin.sendAdmin({ case: "rebootSeconds", value: seconds });
  }

  rebootOta(seconds = 0): Promise<Result<unknown, Error>> {
    return this.admin.sendAdmin({ case: "rebootOtaSeconds", value: seconds });
  }

  shutdown(seconds = 0): Promise<Result<unknown, Error>> {
    return this.admin.sendAdmin({ case: "shutdownSeconds", value: seconds });
  }
}
