import * as Protobuf from "@meshtastic/protobufs";
import { computed } from "@preact/signals-core";
import type { ResultType } from "better-result";
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

  constructor(client: MeshClient) {
    this.client = client;
    this.store = createConfigStore();
    this.radio = this.store.radio.read;
    this.modules = this.store.modules.read;
    this.editor = new ConfigEditor(client);

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
  }

  public beginEdit(): Promise<ResultType<number, Error>> {
    return beginEditSettings(this.client);
  }

  public commitEdit(): Promise<ResultType<number, Error>> {
    return commitEditSettings(this.client);
  }

  public setRadio(
    config: Protobuf.Config.Config,
  ): Promise<ResultType<number, Error>> {
    return setConfig(this.client, config);
  }

  public getRadio(
    type: Protobuf.Admin.AdminMessage_ConfigType,
  ): Promise<ResultType<number, Error>> {
    return getConfig(this.client, type);
  }

  public setModule(
    moduleConfig: Protobuf.ModuleConfig.ModuleConfig,
  ): Promise<ResultType<number, Error>> {
    return setModuleConfig(this.client, moduleConfig);
  }

  public getModule(
    type: Protobuf.Admin.AdminMessage_ModuleConfigType,
  ): Promise<ResultType<number, Error>> {
    return getModuleConfig(this.client, type);
  }
}
