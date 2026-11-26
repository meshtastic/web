import { interceptAdmin } from "@app/tests/adminInterceptor.ts";
import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { describe, expect, it } from "vitest";
import { sessionIo } from "./configEditorIo.ts";
import { FakeKmpClient, state } from "./fakeClient.ts";
import { MeshSession } from "./session.ts";

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

describe("sessionIo", () => {
  function setup() {
    const kmp = new FakeKmpClient();
    const session = new MeshSession(kmp);
    const radio = interceptAdmin(kmp);
    const pending: boolean[] = [];
    session.events.onPendingSettingsChange.subscribe((p) => pending.push(p));
    return { kmp, session, radio, pending, io: sessionIo(session) };
  }

  it("commits the messages as one settings transaction", async () => {
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

  it("sends one message outside a settings transaction", async () => {
    const { io, radio, pending } = setup();
    const result = await io.send(setLora());
    expect(result.status).toBe("ok");
    expect(radio.cases()).toEqual(["setConfig"]);
    expect(pending).toEqual([true, false]);
  });

  it("reports a failed transaction", async () => {
    const { io, radio, pending } = setup();
    radio.failNext("setOwner");
    const result = await io.commit([setLora(), setOwner("Alice")]);
    expect(result.status).toBe("error");
    expect(pending).toEqual([true, false]);
  });

  it("relays config, module config, channel packets and disconnects", () => {
    const { io, session, kmp } = setup();
    const seen: string[] = [];
    io.onConfig((c) => seen.push(`config:${c.payloadVariant.case}`));
    io.onModuleConfig((c) => seen.push(`module:${c.payloadVariant.case}`));
    io.onChannel((c) => seen.push(`channel:${c.index}`));
    io.onDisconnect(() => seen.push("disconnect"));
    session.events.onConfigPacket.dispatch(
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: { case: "lora", value: {} },
      }),
    );
    session.events.onModuleConfigPacket.dispatch(
      create(Protobuf.ModuleConfig.ModuleConfigSchema, {
        payloadVariant: { case: "mqtt", value: {} },
      }),
    );
    session.events.onChannelPacket.dispatch(
      create(Protobuf.Channel.ChannelSchema, { index: 2 }),
    );
    kmp.setState(state("disconnected"));
    expect(seen).toEqual([
      "config:lora",
      "module:mqtt",
      "channel:2",
      "disconnect",
    ]);
  });
});
