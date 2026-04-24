import type * as Protobuf from "@meshtastic/protobufs";
import type { MeshClient } from "../../core/client/MeshClient.ts";
import type { ReadonlySignal } from "../../core/signals/createStore.ts";
import { DeviceStatusEnum } from "../../core/transport/Transport.ts";
import { reboot, rebootOta, shutdown } from "./application/RebootService.ts";
import { getMetadata } from "./application/GetMetadataUseCase.ts";
import { createDeviceStore, type DeviceStore } from "./state/deviceStore.ts";

/**
 * Device slice facade. Owns status/metadata signals and exposes the
 * reboot/shutdown/metadata commands.
 */
export class DeviceClient {
  private readonly store: DeviceStore;
  private readonly client: MeshClient;

  public readonly status: ReadonlySignal<DeviceStatusEnum>;
  public readonly isConfigured: ReadonlySignal<boolean>;
  public readonly pendingSettingsChanges: ReadonlySignal<boolean>;
  public readonly myNodeNum: ReadonlySignal<number | undefined>;
  public readonly metadata: ReadonlySignal<Protobuf.Mesh.DeviceMetadata | undefined>;
  public readonly myNodeInfo: ReadonlySignal<Protobuf.Mesh.MyNodeInfo | undefined>;

  constructor(client: MeshClient) {
    this.client = client;
    this.store = createDeviceStore();
    this.status = this.store.status.read;
    this.isConfigured = this.store.isConfigured.read;
    this.pendingSettingsChanges = this.store.pendingSettingsChanges.read;
    this.myNodeNum = this.store.myNodeNum.read;
    this.metadata = this.store.metadata.read;
    this.myNodeInfo = this.store.myNodeInfo.read;

    client.events.onDeviceStatus.subscribe((status) => {
      this.store.status.write.value = status;
      if (status === DeviceStatusEnum.DeviceConfigured) {
        this.store.isConfigured.write.value = true;
      } else if (status === DeviceStatusEnum.DeviceConfiguring) {
        this.store.isConfigured.write.value = false;
      }
    });

    client.events.onMyNodeInfo.subscribe((info) => {
      this.store.myNodeInfo.write.value = info;
      this.store.myNodeNum.write.value = info.myNodeNum;
    });

    client.events.onDeviceMetadataPacket.subscribe((pkt) => {
      this.store.metadata.write.value = pkt.data;
    });

    client.events.onPendingSettingsChange.subscribe((pending) => {
      this.store.pendingSettingsChanges.write.value = pending;
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
