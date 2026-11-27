import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { AdminError, type AdminVariant } from "@core/kmp/admin.ts";
import { editorFor } from "@core/kmp/configEditorIo.ts";
import { adminOk, FakeKmpClient, state } from "@core/kmp/fakeClient.ts";
import { MeshSession } from "@core/kmp/session.ts";
import { Protobuf } from "@core/protobuf.ts";
import type { AdminResultJs } from "@meshtastic/sdk-kmp";
import { Result } from "better-result";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  REMOTE_LATE_REPLY_MS,
  RemoteSecurityLockedError,
  RemoteSettings,
  type RemoteSettingsDeps,
  requestFor,
  summarizeSave,
  withNodePrivateKey,
} from "./remoteSettings.ts";

const NODE = 0x0c40;

const loraConfig = (region: number) =>
  create(Protobuf.Config.ConfigSchema, {
    payloadVariant: {
      case: "lora",
      value: create(Protobuf.Config.Config_LoRaConfigSchema, { region }),
    },
  });

/** As firmware 2.7 sends it (with the key), or 2.8.1+ (without). */
const securityConfig = (privateKey: Uint8Array = new Uint8Array(32).fill(9)) =>
  create(Protobuf.Config.ConfigSchema, {
    payloadVariant: {
      case: "security",
      value: create(Protobuf.Config.Config_SecurityConfigSchema, {
        publicKey: new Uint8Array(32).fill(7),
        privateKey,
      }),
    },
  });

const securityOf = (message: Protobuf.Admin.AdminMessage | undefined) =>
  message?.payloadVariant.case === "setConfig" &&
  message.payloadVariant.value.payloadVariant.case === "security"
    ? message.payloadVariant.value.payloadVariant.value
    : undefined;

const answer = (bytes: Uint8Array): Result<AdminResultJs, Error> =>
  Result.ok(adminOk(bytes));

const configAnswer = (config: Protobuf.Config.Config) =>
  answer(toBinary(Protobuf.Config.ConfigSchema, config));

/** A sendAdmin that answers gets from `answers`, and acks every set. */
function setup(answers: Partial<Record<string, () => unknown>> = {}) {
  const sent: Array<{
    variant: AdminVariant;
    dest: number;
    timeoutMs?: number;
  }> = [];
  const disconnects = new Set<() => void>();
  const forgetNode = vi.fn();
  const sendAdmin = vi.fn(
    async (variant: AdminVariant, dest: number, timeoutMs?: number) => {
      sent.push({ variant, dest, timeoutMs });
      const scripted = answers[variant.case ?? ""];
      if (scripted) return scripted() as Result<AdminResultJs, Error>;
      return Result.ok(adminOk());
    },
  );
  const transactions: Array<{
    messages: readonly Protobuf.Admin.AdminMessage[];
    dest: number;
    timeoutMs?: number;
  }> = [];
  const editSettings = vi.fn(
    async (
      messages: readonly Protobuf.Admin.AdminMessage[],
      dest: number,
      timeoutMs?: number,
    ): Promise<Result<void, Error>> => {
      transactions.push({ messages, dest, timeoutMs });
      return Result.ok(undefined);
    },
  );
  const deps: RemoteSettingsDeps = {
    sendAdmin,
    editSettings,
    onDisconnect: (cb) => {
      disconnects.add(cb);
      return () => disconnects.delete(cb);
    },
    forgetNode,
  };
  const remote = new RemoteSettings(NODE, deps);
  const disconnect = () => {
    for (const cb of disconnects) cb();
  };
  return {
    remote,
    sent,
    sendAdmin,
    transactions,
    editSettings,
    forgetNode,
    disconnect,
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  vi.useRealTimers();
});

describe("requestFor", () => {
  it("maps each section to its get request", () => {
    expect(requestFor("config:lora")).toEqual({
      case: "getConfigRequest",
      value: Protobuf.Admin.AdminMessage_ConfigType.LORA_CONFIG,
    });
    expect(requestFor("module:mqtt")).toEqual({
      case: "getModuleConfigRequest",
      value: Protobuf.Admin.AdminMessage_ModuleConfigType.MQTT_CONFIG,
    });
    expect(requestFor("owner")).toEqual({
      case: "getOwnerRequest",
      value: true,
    });
    expect(requestFor("metadata")).toEqual({
      case: "getDeviceMetadataRequest",
      value: true,
    });
    expect(requestFor("config:sessionkey")).toBeUndefined();
  });
});

describe("RemoteSettings loading", () => {
  it("reads a section from the node once, with a long SDK timeout", async () => {
    const { remote, sent } = setup({
      getConfigRequest: () => configAnswer(loraConfig(3)),
    });
    await remote.load("config:lora");
    await remote.load("config:lora");

    expect(sent).toEqual([
      {
        variant: {
          case: "getConfigRequest",
          value: Protobuf.Admin.AdminMessage_ConfigType.LORA_CONFIG,
        },
        dest: NODE,
        timeoutMs: REMOTE_LATE_REPLY_MS,
      },
    ]);
    expect(remote.stateOf("config:lora")).toEqual({ status: "loaded" });
    expect(remote.editor.deviceRadio.value.lora?.region).toBe(3);
    expect(remote.editor.radio.value.lora?.region).toBe(3);
    expect(remote.editor.isDirty.value).toBe(false);
  });

  it("reads the owner and metadata", async () => {
    const { remote } = setup({
      getOwnerRequest: () =>
        answer(
          toBinary(
            Protobuf.Mesh.UserSchema,
            create(Protobuf.Mesh.UserSchema, { longName: "IB North" }),
          ),
        ),
      getDeviceMetadataRequest: () =>
        answer(
          toBinary(
            Protobuf.Mesh.DeviceMetadataSchema,
            create(Protobuf.Mesh.DeviceMetadataSchema, {
              firmwareVersion: "2.7.20",
            }),
          ),
        ),
    });
    await remote.load("owner");
    await remote.load("metadata");
    expect(remote.editor.owner.value?.longName).toBe("IB North");
    expect(remote.metadata.value?.firmwareVersion).toBe("2.7.20");
  });

  it("gives up waiting after the deadline, but takes a late answer", async () => {
    vi.useFakeTimers();
    let reply: (value: Result<AdminResultJs, Error>) => void = () => {};
    const { remote } = setup({
      getConfigRequest: () =>
        new Promise((resolve) => {
          reply = resolve;
        }),
    });
    const loading = remote.load("config:lora");
    await vi.advanceTimersByTimeAsync(0);
    expect(remote.stateOf("config:lora")).toEqual({ status: "loading" });

    await vi.advanceTimersByTimeAsync(30_000);
    await loading;
    expect(remote.stateOf("config:lora")).toEqual({
      status: "failed",
      reason: "unreachable",
    });

    reply(configAnswer(loraConfig(5)));
    await vi.advanceTimersByTimeAsync(0);
    expect(remote.stateOf("config:lora")).toEqual({ status: "loaded" });
    expect(remote.editor.radio.value.lora?.region).toBe(5);
  });

  it.each([
    ["unauthorized", "unauthorized"],
    ["NO_ROUTE", "unreachable"],
    ["timeout", "unreachable"],
    ["rate-limited", "error"],
  ])("maps a %s failure to %s", async (reason, expected) => {
    const { remote, forgetNode } = setup({
      getConfigRequest: () => Result.err(new AdminError(reason)),
    });
    await remote.load("config:lora");
    expect(remote.stateOf("config:lora")).toEqual({
      status: "failed",
      reason: expected,
    });
    expect(forgetNode).toHaveBeenCalledTimes(
      expected === "unauthorized" ? 1 : 0,
    );
  });

  it("retries a failed section", async () => {
    let calls = 0;
    const { remote } = setup({
      getConfigRequest: () =>
        ++calls === 1
          ? Result.err(new AdminError("NO_ROUTE"))
          : configAnswer(loraConfig(2)),
    });
    await remote.load("config:lora");
    expect(remote.stateOf("config:lora")?.status).toBe("failed");
    await remote.retry("config:lora");
    expect(remote.stateOf("config:lora")).toEqual({ status: "loaded" });
  });

  it("doesn't let an earlier attempt's late failure fail a retry", async () => {
    const replies: Array<(value: Result<AdminResultJs, Error>) => void> = [];
    const { remote } = setup({
      getConfigRequest: () =>
        new Promise((resolve) => {
          replies.push(resolve);
        }),
    });
    void remote.load("config:lora");
    await flush();
    void remote.retry("config:lora");
    replies[0]?.(Result.err(new AdminError("timeout")));
    await flush();
    expect(remote.stateOf("config:lora")).toEqual({ status: "loading" });
    replies[1]?.(configAnswer(loraConfig(4)));
    await flush();
    expect(remote.stateOf("config:lora")).toEqual({ status: "loaded" });
  });

  it("forgets everything it read when the local radio disconnects", async () => {
    const { remote, disconnect } = setup({
      getConfigRequest: () => configAnswer(loraConfig(3)),
    });
    await remote.load("config:lora");
    disconnect();
    expect(remote.loads.value.size).toBe(0);
    expect(remote.editor.radio.value).toEqual({});
  });
});

describe("RemoteSettings saving", () => {
  async function loaded(nodeKey?: Uint8Array) {
    const queue = [loraConfig(3), securityConfig(nodeKey)];
    const env = setup({
      getConfigRequest: () => configAnswer(queue.shift() ?? loraConfig(3)),
    });
    await env.remote.load("config:lora");
    await env.remote.load("config:security");
    env.sent.length = 0;
    return env;
  }

  it("sends a single changed section as its own set message", async () => {
    const { remote, sent, transactions } = await loaded();
    remote.editor.setRadioSection("lora", { region: 8 });

    const result = await remote.save();
    expect(Result.isOk(result) && summarizeSave(result.value)).toEqual({
      saved: 1,
      failed: 0,
      skipped: 0,
      reason: undefined,
    });
    expect(sent.map((entry) => [entry.variant.case, entry.dest])).toEqual([
      ["setConfig", NODE],
    ]);
    expect(transactions).toEqual([]);
    expect(remote.editor.isDirty.value).toBe(false);
    expect(remote.editor.deviceRadio.value.lora?.region).toBe(8);
  });

  it("sends several sections in one transaction, so the node restarts once", async () => {
    const { remote, sent, transactions } = await loaded();
    remote.editor.setRadioSection("lora", { region: 8 });
    remote.editor.setOwner(
      create(Protobuf.Mesh.UserSchema, { longName: "Renamed" }),
    );

    const result = await remote.save();
    expect(Result.isOk(result) && summarizeSave(result.value).saved).toBe(2);
    expect(sent).toEqual([]);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]?.dest).toBe(NODE);
    expect(transactions[0]?.timeoutMs).toBe(REMOTE_LATE_REPLY_MS);
    expect(
      transactions[0]?.messages.map((message) => message.payloadVariant.case),
    ).toEqual(["setConfig", "setOwner"]);
    expect(remote.editor.isDirty.value).toBe(false);
  });

  it("keeps every section dirty when the transaction fails", async () => {
    const { remote, editSettings, forgetNode } = await loaded();
    editSettings.mockResolvedValue(Result.err(new AdminError("timeout")));
    remote.editor.setRadioSection("lora", { region: 8 });
    remote.editor.setOwner(
      create(Protobuf.Mesh.UserSchema, { longName: "Renamed" }),
    );
    const result = await remote.save();
    expect(Result.isOk(result) && summarizeSave(result.value)).toEqual({
      saved: 0,
      failed: 2,
      skipped: 0,
      reason: "unreachable",
    });
    expect(remote.editor.dirtyRadioSections.value).toEqual(["lora"]);
    expect(remote.editor.isOwnerDirty.value).toBe(true);
    expect(forgetNode).not.toHaveBeenCalled();
  });

  it("sends back the private key the node sent, whatever the form holds", async () => {
    const nodeKey = new Uint8Array(32).fill(9);
    const { remote, sent } = await loaded(nodeKey);
    expect(remote.securityWritable()).toBe(true);
    remote.editor.setRadioSection("security", {
      serialEnabled: true,
      privateKey: new Uint8Array(32).fill(1),
    });
    await remote.save();
    const [write] = sent;
    const message =
      write?.variant.case === "setConfig"
        ? create(Protobuf.Admin.AdminMessageSchema, {
            payloadVariant: write.variant,
          })
        : undefined;
    expect(securityOf(message)?.serialEnabled).toBe(true);
    expect(securityOf(message)?.privateKey).toEqual(nodeKey);
  });

  it("refuses a security write when the node withheld its key", async () => {
    const { remote, sent, transactions } = await loaded(new Uint8Array(0));
    expect(remote.securityWritable()).toBe(false);
    remote.editor.setRadioSection("security", { serialEnabled: true });
    const single = await remote.save();
    expect(
      Result.isOk(single) &&
        single.value[0]?.status === "failed" &&
        single.value[0].error,
    ).toBeInstanceOf(RemoteSecurityLockedError);

    remote.editor.setRadioSection("lora", { region: 8 });
    const batch = await remote.save();
    expect(Result.isOk(batch) && summarizeSave(batch.value).failed).toBe(2);
    expect(sent).toEqual([]);
    expect(transactions).toEqual([]);
    expect(remote.editor.dirtyRadioSections.value).toHaveLength(2);
  });

  it("forgets the node when it refuses a save", async () => {
    const { remote, sendAdmin, forgetNode } = await loaded();
    sendAdmin.mockResolvedValue(Result.err(new AdminError("unauthorized")));
    remote.editor.setRadioSection("lora", { region: 8 });
    await remote.save();
    expect(forgetNode).toHaveBeenCalledWith(NODE);
  });
});

describe("withNodePrivateKey", () => {
  const securityWrite = (privateKey: Uint8Array) =>
    create(Protobuf.Admin.AdminMessageSchema, {
      payloadVariant: { case: "setConfig", value: securityConfig(privateKey) },
    });

  it("never lets a security write out without a 32-byte key", () => {
    for (const key of [undefined, new Uint8Array(0), new Uint8Array(16)]) {
      const result = withNodePrivateKey(securityWrite(new Uint8Array(32)), key);
      expect(Result.isError(result)).toBe(true);
    }
  });

  it("passes other writes through untouched", () => {
    const owner = create(Protobuf.Admin.AdminMessageSchema, {
      payloadVariant: {
        case: "setOwner",
        value: create(Protobuf.Mesh.UserSchema),
      },
    });
    const result = withNodePrivateKey(owner, undefined);
    expect(Result.isOk(result) && result.value).toBe(owner);
  });
});

describe("RemoteSettings over a session", () => {
  it("leaves the local radio's config and editor alone", async () => {
    const kmp = new FakeKmpClient();
    const session = new MeshSession(kmp);
    kmp.setState(state("connected"));
    const configs: unknown[] = [];
    session.events.onConfigPacket.subscribe((config) => configs.push(config));
    kmp
      .admin(NODE)
      .results.push(
        adminOk(toBinary(Protobuf.Config.ConfigSchema, loraConfig(3))),
      );

    const remote = new RemoteSettings(NODE, {
      sendAdmin: (variant, dest, timeoutMs) =>
        session.sendAdmin(variant, dest, timeoutMs),
      editSettings: async () => Result.ok(undefined),
      onDisconnect: (cb) =>
        session.events.onConnectionState.subscribe((next) => {
          if (next.kind === "disconnected") cb();
        }),
    });
    await remote.load("config:lora");
    await flush();

    expect(remote.editor.radio.value.lora?.region).toBe(3);
    expect(editorFor(session).radio.value).toEqual({});
    expect(configs).toEqual([]);
    expect(kmp.admins.has(0)).toBe(false);
    const [request] = kmp.admin(NODE).sent;
    expect(
      request &&
        fromBinary(Protobuf.Admin.AdminMessageSchema, request).payloadVariant
          .case,
    ).toBe("getConfigRequest");
    remote.dispose();
  });
});
