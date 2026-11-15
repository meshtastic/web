import { Protobuf } from "@core/protobuf.ts";
import { create, toBinary } from "@bufbuild/protobuf";
import { MeshClient } from "@meshtastic/sdk";
import {
  createFakeTransport,
  interceptAdminMessages,
} from "@meshtastic/sdk/testing";
import { describe, expect, it } from "vitest";
import { facadeIo, meshClientIo } from "./configEditorIo.ts";
import { FakeKmpClient } from "./fakeClient.ts";

const setOwner = (longName: string) =>
  create(Protobuf.Admin.AdminMessageSchema, {
    payloadVariant: {
      case: "setOwner",
      value: create(Protobuf.Mesh.UserSchema, { longName }),
    },
  });

const setLora = () =>
  create(Protobuf.Admin.AdminMessageSchema, {
    payloadVariant: {
      case: "setConfig",
      value: create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: "lora",
          value: create(Protobuf.Config.Config_LoRaConfigSchema, { region: 4 }),
        },
      }),
    },
  });

describe("meshClientIo", () => {
  function setup() {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const radio = interceptAdminMessages(client);
    const pending: boolean[] = [];
    client.events.onPendingSettingsChange.subscribe((p) => pending.push(p));
    return { client, radio, pending, io: meshClientIo(client) };
  }

  it("wraps the messages in a begin/commit transaction", async () => {
    const { io, radio, pending } = setup();
    const result = await io.commit([setLora(), setOwner("Alice")]);
    expect(result.status).toBe("ok");
    expect(radio.cases()).toEqual([
      "beginEditSettings",
      "setConfig",
      "setOwner",
      "commitEditSettings",
    ]);
    expect(pending).toEqual([true, false]);
  });

  it("closes the transaction when a send fails", async () => {
    const { io, radio } = setup();
    radio.failNext("setOwner");
    const result = await io.commit([setLora(), setOwner("Alice")]);
    expect(result.status).toBe("error");
    expect(radio.cases()).toEqual([
      "beginEditSettings",
      "setConfig",
      "setOwner",
      "commitEditSettings",
    ]);
  });

  it("relays config, module config and channel packets", () => {
    const { io, client } = setup();
    const seen: string[] = [];
    io.onConfig((c) => seen.push(`config:${c.payloadVariant.case}`));
    io.onModuleConfig((c) => seen.push(`module:${c.payloadVariant.case}`));
    io.onChannel((c) => seen.push(`channel:${c.index}`));
    client.events.onConfigPacket.dispatch(
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: { case: "lora", value: {} },
      }),
    );
    client.events.onModuleConfigPacket.dispatch(
      create(Protobuf.ModuleConfig.ModuleConfigSchema, {
        payloadVariant: { case: "mqtt", value: {} },
      }),
    );
    client.events.onChannelPacket.dispatch(
      create(Protobuf.Channel.ChannelSchema, { index: 2 }),
    );
    expect(seen).toEqual(["config:lora", "module:mqtt", "channel:2"]);
  });
});

describe("facadeIo", () => {
  it("relays the config bundle and channels as individual packets", () => {
    const client = new FakeKmpClient();
    const io = facadeIo(client);
    const seen: string[] = [];
    io.onConfig((c) => seen.push(`config:${c.payloadVariant.case}`));
    io.onModuleConfig((c) => seen.push(`module:${c.payloadVariant.case}`));
    io.onChannel((c) => seen.push(`channel:${c.index}`));
    io.onDisconnect(() => seen.push("disconnect"));

    client.setConfigBundle({
      myInfo: new Uint8Array(),
      metadata: new Uint8Array(),
      configs: [
        toBinary(
          Protobuf.Config.ConfigSchema,
          create(Protobuf.Config.ConfigSchema, {
            payloadVariant: { case: "device", value: {} },
          }),
        ),
      ],
      moduleConfigs: [
        toBinary(
          Protobuf.ModuleConfig.ModuleConfigSchema,
          create(Protobuf.ModuleConfig.ModuleConfigSchema, {
            payloadVariant: { case: "serial", value: {} },
          }),
        ),
      ],
    });
    client.setChannels([
      toBinary(
        Protobuf.Channel.ChannelSchema,
        create(Protobuf.Channel.ChannelSchema, { index: 1 }),
      ),
    ]);
    client.setState({
      kind: "disconnected",
      attempt: 0,
      maxAttempts: 10,
      progress: 0,
    });

    expect(seen).toEqual([
      "disconnect",
      "config:device",
      "module:serial",
      "channel:1",
      "disconnect",
    ]);
  });

  it("commits through the facade's settings transaction", async () => {
    const client = new FakeKmpClient();
    const io = facadeIo(client);
    const result = await io.commit([setLora()]);
    expect(result.status).toBe("ok");
    expect(client.admin().transactions).toHaveLength(1);
  });
});
