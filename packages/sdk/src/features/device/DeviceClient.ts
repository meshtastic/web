import type * as Protobuf from "@meshtastic/protobufs";
import type { MeshClient } from "../../core/client/MeshClient.ts";
import type { ReadonlySignal } from "../../core/signals/createStore.ts";
import { DeviceStatusEnum } from "../../core/transport/Transport.ts";
import { reboot, rebootOta, shutdown } from "./application/RebootService.ts";
import { getMetadata } from "./application/GetMetadataUseCase.ts";
import { AdminSession } from "./infrastructure/AdminSession.ts";
import { sendAdminMessage } from "./infrastructure/AdminMessageSender.ts";
import { createDeviceStore, type DeviceStore } from "./state/deviceStore.ts";

/**
 * Device slice facade. Owns status/metadata signals and exposes the
 * reboot/shutdown/metadata commands.
 */
export class DeviceClient {
  private readonly store: DeviceStore;
  private readonly client: MeshClient;

  /** Admin session passkeys, per node. */
  public readonly session: AdminSession;

  public readonly status: ReadonlySignal<DeviceStatusEnum>;
  public readonly isConfigured: ReadonlySignal<boolean>;
  public readonly pendingSettingsChanges: ReadonlySignal<boolean>;
  public readonly myNodeNum: ReadonlySignal<number | undefined>;
  public readonly metadata: ReadonlySignal<
    Protobuf.Mesh.DeviceMetadata | undefined
  >;
  public readonly myNodeInfo: ReadonlySignal<
    Protobuf.Mesh.MyNodeInfo | undefined
  >;
  /**
   * Latest lockdown status, on firmware built with lockdown support. While
   * the state is LOCKED, NEEDS_PROVISION or UNLOCK_FAILED the device withholds
   * its channels and NodeDB.
   */
  public readonly lockdownStatus: ReadonlySignal<
    Protobuf.Mesh.LockdownStatus | undefined
  >;
  /** Per-region allowed presets and defaults (firmware 2.8+). */
  public readonly regionPresets: ReadonlySignal<
    Protobuf.Mesh.LoRaRegionPresetMap | undefined
  >;

  constructor(client: MeshClient) {
    this.client = client;
    this.session = new AdminSession(client.events);
    this.store = createDeviceStore();
    this.status = this.store.status.read;
    this.isConfigured = this.store.isConfigured.read;
    this.pendingSettingsChanges = this.store.pendingSettingsChanges.read;
    this.myNodeNum = this.store.myNodeNum.read;
    this.metadata = this.store.metadata.read;
    this.myNodeInfo = this.store.myNodeInfo.read;
    this.lockdownStatus = this.store.lockdownStatus.read;
    this.regionPresets = this.store.regionPresets.read;

    client.events.onDeviceStatus.subscribe((status) => {
      this.store.status.write.value = status;
      if (status === DeviceStatusEnum.DeviceConfigured) {
        this.store.isConfigured.write.value = true;
        this.seedOwnSession();
      } else if (status === DeviceStatusEnum.DeviceConfiguring) {
        this.store.isConfigured.write.value = false;
      } else if (status === DeviceStatusEnum.DeviceDisconnected) {
        this.session.clear();
      }
    });

    client.events.onMyNodeInfo.subscribe((info) => {
      // Firmware 2.8 can renumber the node; passkeys belong to the old one.
      if (
        this.store.myNodeNum.read.value !== undefined &&
        this.store.myNodeNum.read.value !== info.myNodeNum
      ) {
        this.session.clear();
      }
      this.store.myNodeInfo.write.value = info;
      this.store.myNodeNum.write.value = info.myNodeNum;
    });

    client.events.onDeviceMetadataPacket.subscribe((pkt) => {
      this.store.metadata.write.value = pkt.data;
    });

    client.events.onLockdownStatus.subscribe((status) => {
      this.store.lockdownStatus.write.value = status;
    });

    client.events.onRegionPresets.subscribe((presets) => {
      this.store.regionPresets.write.value = presets;
    });

    client.events.onPendingSettingsChange.subscribe((pending) => {
      this.store.pendingSettingsChanges.write.value = pending;
    });
  }

  /**
   * Ask the connected node for its owner once the handshake completes. The
   * response carries the session passkey, as the Android app and the Kotlin
   * SDK do it.
   */
  private seedOwnSession(): void {
    sendAdminMessage(this.client, {
      case: "getOwnerRequest",
      value: true,
    }).catch((e: unknown) => {
      this.client.log.warn("⚠️ Unable to seed the admin session", e);
    });
  }

  public reboot(seconds = 0): Promise<number> {
    return reboot(this.client, seconds);
  }

  public rebootOta(seconds = 0): Promise<number> {
    return rebootOta(this.client, seconds);
  }

  public shutdown(seconds = 0): Promise<number> {
    return shutdown(this.client, seconds);
  }

  public getMetadata(nodeNum: number): Promise<number> {
    return getMetadata(this.client, nodeNum);
  }
}
