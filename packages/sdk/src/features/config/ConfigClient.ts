import * as Protobuf from "@meshtastic/protobufs";
import { computed } from "@preact/signals-core";
import { Result } from "better-result";
import type { MeshClient } from "../../core/client/MeshClient.ts";
import {
  type ReadonlySignal,
  toReadonly,
} from "../../core/signals/createStore.ts";
import {
  beginEditSettings,
  commitEditSettings,
  getConfig,
  getModuleConfig,
  setConfig,
  setModuleConfig,
} from "./application/ConfigUseCases.ts";
import {
  requestCannedMessages,
  requestRingtone,
  setCannedMessages,
  setRingtone,
} from "./application/ModuleMessagesUseCases.ts";
import { DeviceStatusEnum } from "../device/domain/DeviceStatus.ts";
import { ConfigEditor } from "./domain/ConfigEditor.ts";
import type { ModuleConfig } from "./domain/ModuleConfig.ts";
import type { RadioConfig } from "./domain/RadioConfig.ts";
import { ConfigMapper } from "./infrastructure/ConfigMapper.ts";
import { type ConfigStore, createConfigStore } from "./state/configStore.ts";

export class ConfigClient {
  private readonly client: MeshClient;
  private readonly store: ConfigStore;
  public readonly radio: ReadonlySignal<RadioConfig>;
  public readonly modules: ReadonlySignal<ModuleConfig>;
  public readonly editor: ConfigEditor;
  /**
   * `true` when the device has not yet been assigned a LoRa region — the
   * canonical "newly-flashed / unconfigured device" cue. Mirrors
   * Meshtastic-Android's `regionUnset` flow (a freshly-flashed firmware
   * defaults `Config.LoRa.region` to `UNSET = 0` until the user picks one).
   *
   * Stays `false` until a LoRa config packet arrives, so consumers don't
   * flash a "set region" prompt during the connect handshake.
   */
  public readonly isRegionUnset: ReadonlySignal<boolean>;
  /**
   * The device's `|`-separated canned message list, or undefined until
   * {@link requestCannedMessages} has been answered.
   */
  public readonly cannedMessages: ReadonlySignal<string | undefined>;
  /**
   * The External Notification ringtone (RTTTL), or undefined until
   * {@link requestRingtone} has been answered.
   */
  public readonly ringtone: ReadonlySignal<string | undefined>;

  constructor(client: MeshClient) {
    this.client = client;
    this.store = createConfigStore();
    this.radio = this.store.radio.read;
    this.modules = this.store.modules.read;
    this.cannedMessages = this.store.cannedMessages.read;
    this.ringtone = this.store.ringtone.read;
    this.editor = new ConfigEditor(client, {
      onStagedAdminMessageCommitted: (message) =>
        this.applySentAdminMessage(message.payloadVariant),
    });

    this.isRegionUnset = toReadonly(
      computed(() => {
        const lora = this.store.radio.write.value.lora;
        if (!lora) return false;
        return (
          lora.region === Protobuf.Config.Config_LoRaConfig_RegionCode.UNSET
        );
      }),
    );

    client.events.onConfigPacket.subscribe((config) => {
      this.store.radio.write.value = ConfigMapper.mergeRadio(
        this.store.radio.write.value,
        config,
      );
    });
    client.events.onModuleConfigPacket.subscribe((moduleConfig) => {
      this.store.modules.write.value = ConfigMapper.mergeModule(
        this.store.modules.write.value,
        moduleConfig,
      );
    });
    client.events.onAdminPacket.subscribe((packet) => {
      // Only the local node's answers; a remote node's list is not ours.
      if (packet.from !== client.myNodeNum) return;
      const variant = packet.data.payloadVariant;
      if (variant.case === "getCannedMessageModuleMessagesResponse") {
        this.store.cannedMessages.write.value = variant.value;
      } else if (variant.case === "getRingtoneResponse") {
        this.store.ringtone.write.value = variant.value;
      }
    });
    client.events.onDeviceStatus.subscribe((status) => {
      if (status === DeviceStatusEnum.DeviceDisconnected) {
        this.store.cannedMessages.write.value = undefined;
        this.store.ringtone.write.value = undefined;
      }
    });
  }

  /** Ask the device for its canned message list; see {@link cannedMessages}. */
  public requestCannedMessages(): Promise<Result<number, Error>> {
    return requestCannedMessages(this.client);
  }

  /** Set the canned message list (`|`-separated, at most 200 bytes). */
  public async setCannedMessages(
    messages: string,
  ): Promise<Result<number, Error>> {
    const result = await setCannedMessages(this.client, messages);
    if (Result.isOk(result)) {
      this.store.cannedMessages.write.value = messages;
    }
    return result;
  }

  /** Ask the device for its ringtone; see {@link ringtone}. */
  public requestRingtone(): Promise<Result<number, Error>> {
    return requestRingtone(this.client);
  }

  /** Set the External Notification ringtone (RTTTL, at most 230 bytes). */
  public async setRingtone(ringtone: string): Promise<Result<number, Error>> {
    const result = await setRingtone(this.client, ringtone);
    if (Result.isOk(result)) {
      this.store.ringtone.write.value = ringtone;
    }
    return result;
  }

  /** Keep the cached values in step with sets sent through the editor. */
  private applySentAdminMessage(
    variant: Protobuf.Admin.AdminMessage["payloadVariant"],
  ): void {
    if (variant.case === "setCannedMessageModuleMessages") {
      this.store.cannedMessages.write.value = variant.value;
    } else if (variant.case === "setRingtoneMessage") {
      this.store.ringtone.write.value = variant.value;
    }
  }

  public beginEdit(): Promise<Result<number, Error>> {
    return beginEditSettings(this.client);
  }

  public commitEdit(): Promise<Result<number, Error>> {
    return commitEditSettings(this.client);
  }

  public setRadio(
    config: Protobuf.Config.Config,
  ): Promise<Result<number, Error>> {
    return setConfig(this.client, config);
  }

  public getRadio(
    type: Protobuf.Admin.AdminMessage_ConfigType,
  ): Promise<Result<number, Error>> {
    return getConfig(this.client, type);
  }

  public setModule(
    moduleConfig: Protobuf.ModuleConfig.ModuleConfig,
  ): Promise<Result<number, Error>> {
    return setModuleConfig(this.client, moduleConfig);
  }

  public getModule(
    type: Protobuf.Admin.AdminMessage_ModuleConfigType,
  ): Promise<Result<number, Error>> {
    return getModuleConfig(this.client, type);
  }
}
