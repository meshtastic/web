import { Protobuf } from "@core/protobuf.ts";
import { create } from "@bufbuild/protobuf";
import { Result } from "better-result";
import { describe, expect, it } from "vitest";
import {
  ConfigEditor,
  type ConfigEditorIo,
  ManagedModeNotAloneError,
} from "./configEditor.ts";

type AdminCase = Protobuf.Admin.AdminMessage["payloadVariant"]["case"];

/**
 * A device the editor can talk to: tests push config and watch what each
 * commit sends. `hold()` keeps the next commit in flight until released,
 * `failNext()` makes it fail.
 */
class FakeIo implements ConfigEditorIo {
  readonly commits: Protobuf.Admin.AdminMessage[][] = [];
  readonly sent: Protobuf.Admin.AdminMessage[] = [];
  private configs = new Set<(c: Protobuf.Config.Config) => void>();
  private modules = new Set<(c: Protobuf.ModuleConfig.ModuleConfig) => void>();
  private channels = new Set<(c: Protobuf.Channel.Channel) => void>();
  private disconnects = new Set<() => void>();
  private held: { reached: () => void; released: Promise<void> } | undefined;
  private failures = 0;

  onConfig(cb: (c: Protobuf.Config.Config) => void): () => void {
    this.configs.add(cb);
    return () => this.configs.delete(cb);
  }
  onModuleConfig(cb: (c: Protobuf.ModuleConfig.ModuleConfig) => void) {
    this.modules.add(cb);
    return () => this.modules.delete(cb);
  }
  onChannel(cb: (c: Protobuf.Channel.Channel) => void): () => void {
    this.channels.add(cb);
    return () => this.channels.delete(cb);
  }
  onDisconnect(cb: () => void): () => void {
    this.disconnects.add(cb);
    return () => this.disconnects.delete(cb);
  }
  async commit(
    messages: readonly Protobuf.Admin.AdminMessage[],
  ): Promise<Result<void, Error>> {
    this.commits.push([...messages]);
    const held = this.held;
    if (held) {
      this.held = undefined;
      held.reached();
      await held.released;
    }
    if (this.failures > 0) {
      this.failures--;
      return Result.err(new Error("send failed"));
    }
    return Result.ok(undefined);
  }

  async send(
    message: Protobuf.Admin.AdminMessage,
  ): Promise<Result<void, Error>> {
    this.sent.push(message);
    return Result.ok(undefined);
  }

  config(c: Protobuf.Config.Config): void {
    for (const cb of this.configs) cb(c);
  }
  moduleConfig(c: Protobuf.ModuleConfig.ModuleConfig): void {
    for (const cb of this.modules) cb(c);
  }
  channel(c: Protobuf.Channel.Channel): void {
    for (const cb of this.channels) cb(c);
  }
  disconnect(): void {
    for (const cb of this.disconnects) cb();
  }
  hold(): { reached: Promise<void>; release: () => void } {
    let reached = () => {};
    let release = () => {};
    const reachedPromise = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.held = { reached, released };
    return { reached: reachedPromise, release };
  }
  failNext(): void {
    this.failures++;
  }
  cases(): AdminCase[] {
    return this.commits.flat().map((m) => m.payloadVariant.case);
  }
  sentConfig(
    section: Protobuf.Config.Config["payloadVariant"]["case"],
  ): Protobuf.Config.Config["payloadVariant"] | undefined {
    for (const m of this.commits.flat()) {
      if (m.payloadVariant.case !== "setConfig") continue;
      const variant = m.payloadVariant.value.payloadVariant;
      if (variant.case === section) return variant;
    }
    return undefined;
  }
  sentModuleConfig(
    section: Protobuf.ModuleConfig.ModuleConfig["payloadVariant"]["case"],
  ): Protobuf.ModuleConfig.ModuleConfig["payloadVariant"] | undefined {
    for (const m of this.commits.flat()) {
      if (m.payloadVariant.case !== "setModuleConfig") continue;
      const variant = m.payloadVariant.value.payloadVariant;
      if (variant.case === section) return variant;
    }
    return undefined;
  }
}

function loraPacket(region: number): Protobuf.Config.Config {
  return create(Protobuf.Config.ConfigSchema, {
    payloadVariant: {
      case: "lora",
      value: create(Protobuf.Config.Config_LoRaConfigSchema, { region }),
    },
  });
}

function mqttPacket(enabled: boolean): Protobuf.ModuleConfig.ModuleConfig {
  return create(Protobuf.ModuleConfig.ModuleConfigSchema, {
    payloadVariant: {
      case: "mqtt",
      value: create(Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema, {
        enabled,
      }),
    },
  });
}

function channelPacket(index: number, name: string): Protobuf.Channel.Channel {
  return create(Protobuf.Channel.ChannelSchema, {
    index,
    role: Protobuf.Channel.Channel_Role.SECONDARY,
    settings: create(Protobuf.Channel.ChannelSettingsSchema, { name }),
  });
}

const lora = (region: number) =>
  create(Protobuf.Config.Config_LoRaConfigSchema, { region });

const enableMqtt = () =>
  create(Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema, {
    enabled: true,
  });

const user = (longName: string) =>
  create(Protobuf.Mesh.UserSchema, { id: "!00000001", longName });

function setup() {
  const io = new FakeIo();
  const editor = new ConfigEditor(io);
  return { io, editor };
}

describe("ConfigEditor", () => {
  it("starts clean and tracks dirty when working diverges from baseline", () => {
    const { io, editor } = setup();
    expect(editor.isDirty.value).toBe(false);

    io.config(loraPacket(4));
    expect(editor.isDirty.value).toBe(false);
    expect(editor.radio.value.lora?.region).toBe(4);

    editor.setRadioSection("lora", lora(7));
    expect(editor.isDirty.value).toBe(true);
    expect(editor.dirtyRadioSections.value).toEqual(["lora"]);
  });

  it("tracks module and channel dirtiness independently", () => {
    const { io, editor } = setup();
    io.moduleConfig(mqttPacket(false));
    io.channel(channelPacket(1, "primary"));

    editor.setModuleSection("mqtt", enableMqtt());
    expect(editor.dirtyModuleSections.value).toEqual(["mqtt"]);

    editor.setChannel(channelPacket(1, "renamed"));
    expect(editor.dirtyChannels.value).toEqual([1]);
    expect(editor.isDirty.value).toBe(true);
  });

  it("reset() restores working = baseline and clears dirty flags", () => {
    const { io, editor } = setup();
    io.config(loraPacket(4));
    editor.setRadioSection("lora", lora(7));
    expect(editor.isDirty.value).toBe(true);

    editor.reset();
    expect(editor.isDirty.value).toBe(false);
    expect(editor.radio.value.lora?.region).toBe(4);
  });

  it("reset() drops queued admin messages", () => {
    const { editor } = setup();
    editor.queueAdminMessage(
      create(Protobuf.Admin.AdminMessageSchema, {
        payloadVariant: {
          case: "setFixedPosition",
          value: create(Protobuf.Mesh.PositionSchema, { latitudeI: 1 }),
        },
      }),
    );
    expect(editor.isDirty.value).toBe(true);

    editor.reset();
    expect(editor.isDirty.value).toBe(false);
  });

  it("inbound baseline updates do not stomp pending working edits", () => {
    const { io, editor } = setup();
    io.config(loraPacket(4));
    editor.setRadioSection("lora", lora(7));

    io.config(loraPacket(8));

    expect(editor.radio.value.lora?.region).toBe(7);
    expect(editor.dirtyRadioSections.value).toEqual(["lora"]);
  });

  it("keeps radio fields a partial update leaves out", () => {
    const { io, editor } = setup();
    io.config(
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: "lora",
          value: create(Protobuf.Config.Config_LoRaConfigSchema, {
            region: 4,
            paFanDisabled: true,
            ignoreIncoming: [1234],
          }),
        },
      }),
    );

    editor.setRadioSection("lora", { region: 7 });

    const sent = editor.radio.value.lora;
    expect(sent?.region).toBe(7);
    expect(sent?.paFanDisabled).toBe(true);
    expect(sent?.ignoreIncoming).toEqual([1234]);
    expect(editor.dirtyRadioSections.value).toEqual(["lora"]);
  });

  it("keeps module fields a partial update leaves out", () => {
    const { io, editor } = setup();
    io.moduleConfig(
      create(Protobuf.ModuleConfig.ModuleConfigSchema, {
        payloadVariant: {
          case: "rangeTest",
          value: create(
            Protobuf.ModuleConfig.ModuleConfig_RangeTestConfigSchema,
            { enabled: false, clearOnReboot: true },
          ),
        },
      }),
    );

    editor.setModuleSection("rangeTest", { enabled: true });

    expect(editor.modules.value.rangeTest?.enabled).toBe(true);
    expect(editor.modules.value.rangeTest?.clearOnReboot).toBe(true);
  });

  it("a partial update equal to the baseline is not dirty", () => {
    const { io, editor } = setup();
    io.config(loraPacket(4));
    editor.setRadioSection("lora", { region: 4 });
    expect(editor.isDirty.value).toBe(false);
  });

  it("an undefined section reverts to the baseline", async () => {
    const { io, editor } = setup();
    io.config(loraPacket(4));
    io.moduleConfig(mqttPacket(false));
    editor.setRadioSection("lora", lora(7));
    editor.setRadioSection("lora", undefined);
    editor.setModuleSection("mqtt", undefined);
    editor.setRadioSection("position", undefined);

    expect(editor.radio.value.lora?.region).toBe(4);
    expect(editor.isDirty.value).toBe(false);
    expect((await editor.commit()).status).toBe("ok");
    expect(io.commits).toEqual([]);
  });

  it("disconnect drops baseline and working", () => {
    const { io, editor } = setup();
    io.config(loraPacket(4));
    editor.setRadioSection("lora", lora(7));
    expect(editor.isDirty.value).toBe(true);

    io.disconnect();

    expect(editor.radio.value).toEqual({});
    expect(editor.isDirty.value).toBe(false);
  });

  it("builds a full section from a partial edit when the device sent none", () => {
    const { editor } = setup();
    editor.setRadioSection("lora", { region: 7 });
    expect(editor.radio.value.lora?.region).toBe(7);
    expect(editor.radio.value.lora?.hopLimit).toBe(0);
    expect(editor.dirtyRadioSections.value).toEqual(["lora"]);
  });

  it("dispose() stops listening to the device", () => {
    const { io, editor } = setup();
    editor.dispose();
    io.config(loraPacket(4));
    expect(editor.radio.value).toEqual({});
  });
});

/** A connected editor with lora edited from region 1 to 4. */
function setupCommit() {
  const { io, editor } = setup();
  io.config(loraPacket(1));
  io.moduleConfig(mqttPacket(false));
  io.channel(channelPacket(1, "primary"));
  editor.setRadioSection("lora", lora(4));
  return { io, editor };
}

describe("ConfigEditor.commit", () => {
  it("sends dirty sections, channels, owner and staged messages together", async () => {
    const { io, editor } = setupCommit();
    editor.setModuleSection("mqtt", enableMqtt());
    editor.setChannel(channelPacket(1, "renamed"));
    editor.setBaselineOwner(user("Before"));
    editor.setOwner(user("After"));
    editor.stageAdminMessage(
      "ringtone",
      create(Protobuf.Admin.AdminMessageSchema, {
        payloadVariant: { case: "setRingtoneMessage", value: "a:d=4" },
      }),
    );

    expect((await editor.commit()).status).toBe("ok");

    expect(io.cases()).toEqual([
      "setConfig",
      "setModuleConfig",
      "setChannel",
      "setOwner",
      "setRingtoneMessage",
    ]);
    expect(io.sentConfig("lora")?.value).toMatchObject({ region: 4 });
    expect(io.sentModuleConfig("mqtt")?.value).toMatchObject({
      enabled: true,
    });
    expect(editor.isDirty.value).toBe(false);
    expect(editor.owner.value?.longName).toBe("After");
  });

  it("reports committed staged messages", async () => {
    const io = new FakeIo();
    const committed: Protobuf.Admin.AdminMessage[] = [];
    const editor = new ConfigEditor(io, {
      onStagedAdminMessageCommitted: (m) => committed.push(m),
    });
    const message = create(Protobuf.Admin.AdminMessageSchema, {
      payloadVariant: { case: "setCannedMessageModuleMessages", value: "a|b" },
    });
    editor.stageAdminMessage("cannedMessages", message);

    expect((await editor.commit()).status).toBe("ok");
    expect(committed).toEqual([message]);
    expect(editor.stagedAdminMessages.value.size).toBe(0);
  });

  it("keeps an edit made while a commit is in flight dirty", async () => {
    const { io, editor } = setupCommit();
    const held = io.hold();

    const pending = editor.commit();
    await held.reached;
    editor.setModuleSection("mqtt", enableMqtt());
    held.release();
    expect((await pending).status).toBe("ok");

    expect(editor.dirtyRadioSections.value).toEqual([]);
    expect(editor.dirtyModuleSections.value).toEqual(["mqtt"]);
    expect(io.sentModuleConfig("mqtt")).toBeUndefined();

    expect((await editor.commit()).status).toBe("ok");
    expect(io.sentModuleConfig("mqtt")?.value).toMatchObject({ enabled: true });
    expect(editor.isDirty.value).toBe(false);
  });

  it("keeps device packets for unsent sections that arrive during a commit", async () => {
    const { io, editor } = setupCommit();
    const held = io.hold();

    const pending = editor.commit();
    await held.reached;
    io.moduleConfig(mqttPacket(true));
    io.channel(channelPacket(1, "renamed"));
    held.release();
    expect((await pending).status).toBe("ok");

    expect(editor.isDirty.value).toBe(false);
    expect(editor.modules.value.mqtt?.enabled).toBe(true);
    expect(editor.channels.value.get(1)?.settings?.name).toBe("renamed");
  });

  it("keeps an owner update that arrives during a commit", async () => {
    const { io, editor } = setupCommit();
    editor.setBaselineOwner(user("Before"));
    const held = io.hold();

    const pending = editor.commit();
    await held.reached;
    editor.setBaselineOwner(user("After"));
    held.release();
    expect((await pending).status).toBe("ok");

    expect(editor.isOwnerDirty.value).toBe(false);
    expect(editor.owner.value?.longName).toBe("After");
    expect(io.cases()).not.toContain("setOwner");
  });

  it("leaves the editor empty when the device disconnects during a commit", async () => {
    const { io, editor } = setupCommit();
    const held = io.hold();

    const pending = editor.commit();
    await held.reached;
    io.disconnect();
    held.release();
    expect((await pending).status).toBe("error");

    expect(editor.radio.value).toEqual({});
    expect(editor.isDirty.value).toBe(false);
    io.config(loraPacket(1));
    expect(editor.isDirty.value).toBe(false);
  });

  it("sends a message queued again during a commit", async () => {
    const { io, editor } = setupCommit();
    const message = create(Protobuf.Admin.AdminMessageSchema, {
      payloadVariant: { case: "removeFixedPosition", value: true },
    });
    editor.queueAdminMessage(message);
    const held = io.hold();

    const pending = editor.commit();
    await held.reached;
    editor.queueAdminMessage(message);
    held.release();
    expect((await pending).status).toBe("ok");
    expect(editor.isDirty.value).toBe(true);

    expect((await editor.commit()).status).toBe("ok");
    expect(io.cases().filter((c) => c === "removeFixedPosition")).toHaveLength(
      2,
    );
    expect(editor.isDirty.value).toBe(false);
  });

  it("runs a commit requested during another after it finishes", async () => {
    const { io, editor } = setupCommit();
    const held = io.hold();

    const first = editor.commit();
    await held.reached;
    editor.setModuleSection("mqtt", enableMqtt());
    const second = editor.commit();
    held.release();

    expect((await first).status).toBe("ok");
    expect((await second).status).toBe("ok");
    expect(io.commits.map((c) => c.map((m) => m.payloadVariant.case))).toEqual([
      ["setConfig"],
      ["setModuleConfig"],
    ]);
    expect(editor.isDirty.value).toBe(false);
  });

  it("stays dirty when the commit fails", async () => {
    const { io, editor } = setupCommit();
    editor.setModuleSection("mqtt", enableMqtt());
    io.failNext();

    expect((await editor.commit()).status).toBe("error");

    expect(io.cases()).toEqual(["setConfig", "setModuleConfig"]);
    expect(editor.dirtyRadioSections.value).toEqual(["lora"]);
    expect(editor.dirtyModuleSections.value).toEqual(["mqtt"]);
  });

  describe("turning on managed mode", () => {
    const securityPacket = (isManaged: boolean) =>
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: "security",
          value: create(Protobuf.Config.Config_SecurityConfigSchema, {
            isManaged,
          }),
        },
      });

    function setupSecurity(isManaged: boolean) {
      const { io, editor } = setup();
      io.config(securityPacket(isManaged));
      io.config(loraPacket(4));
      return { io, editor };
    }

    it("sends the security config on its own, outside a transaction", async () => {
      const { io, editor } = setupSecurity(false);
      editor.setRadioSection("security", { isManaged: true });

      expect((await editor.commit()).status).toBe("ok");

      expect(io.commits).toEqual([]);
      expect(io.sent.map((m) => m.payloadVariant.case)).toEqual(["setConfig"]);
      expect(editor.isDirty.value).toBe(false);
    });

    it("refuses to save it with other changes and sends nothing", async () => {
      const { io, editor } = setupSecurity(false);
      editor.setRadioSection("security", { isManaged: true });
      editor.setRadioSection("lora", lora(7));

      const result = await editor.commit();

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toBeInstanceOf(ManagedModeNotAloneError);
      }
      expect(io.commits).toEqual([]);
      expect(io.sent).toEqual([]);
      expect(editor.dirtyRadioSections.value).toEqual(["security", "lora"]);
    });

    it("commits security edits normally when already managed", async () => {
      const { io, editor } = setupSecurity(true);
      editor.setRadioSection("security", { serialEnabled: true });
      editor.setRadioSection("lora", lora(7));

      expect((await editor.commit()).status).toBe("ok");

      expect(io.sent).toEqual([]);
      expect(io.cases()).toEqual(["setConfig", "setConfig"]);
    });
  });
});
