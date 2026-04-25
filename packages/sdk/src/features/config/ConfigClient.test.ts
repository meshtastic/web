import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it } from "vitest";
import { MeshClient } from "../../core/client/MeshClient.ts";
import { createFakeTransport } from "../../core/testing/createFakeTransport.ts";

describe("ConfigClient", () => {
  it("merges incoming Config packets into the radio signal by variant", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });

    expect(client.config.radio.value).toEqual({});

    client.events.onConfigPacket.dispatch(
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: "lora",
          value: create(Protobuf.Config.Config_LoRaConfigSchema, { region: 4 }),
        },
      }),
    );

    expect(client.config.radio.value.lora?.region).toBe(4);
  });

  it("merges incoming ModuleConfig packets into the modules signal", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });

    client.events.onModuleConfigPacket.dispatch(
      create(Protobuf.ModuleConfig.ModuleConfigSchema, {
        payloadVariant: {
          case: "mqtt",
          value: create(Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema, {
            enabled: true,
          }),
        },
      }),
    );

    expect(client.config.modules.value.mqtt?.enabled).toBe(true);
  });
});
