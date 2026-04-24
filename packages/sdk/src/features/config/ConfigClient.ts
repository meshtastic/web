import type * as Protobuf from "@meshtastic/protobufs";
import type { ResultType } from "better-result";
import type { MeshClient } from "../../core/client/MeshClient.ts";
import type { ReadonlySignal } from "../../core/signals/createStore.ts";
import {
  beginEditSettings,
  commitEditSettings,
  getConfig,
  getModuleConfig,
  setConfig,
  setModuleConfig,
} from "./application/ConfigUseCases.ts";
import type { ModuleConfig } from "./domain/ModuleConfig.ts";
import type { RadioConfig } from "./domain/RadioConfig.ts";
import { ConfigMapper } from "./infrastructure/ConfigMapper.ts";
import { type ConfigStore, createConfigStore } from "./state/configStore.ts";

export class ConfigClient {
  private readonly client: MeshClient;
  private readonly store: ConfigStore;
  public readonly radio: ReadonlySignal<RadioConfig>;
  public readonly modules: ReadonlySignal<ModuleConfig>;

  constructor(client: MeshClient) {
    this.client = client;
    this.store = createConfigStore();
    this.radio = this.store.radio.read;
    this.modules = this.store.modules.read;

    client.events.onConfigPacket.subscribe((config) => {
      this.store.radio.write.value = ConfigMapper.mergeRadio(this.store.radio.write.value, config);
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

  public setRadio(config: Protobuf.Config.Config): Promise<ResultType<number, Error>> {
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
