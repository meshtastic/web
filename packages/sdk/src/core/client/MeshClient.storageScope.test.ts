import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it, vi } from "vitest";
import { InMemoryDraftRepository } from "../../features/chat/infrastructure/repositories/InMemoryDraftRepository.ts";
import { InMemoryMessageRepository } from "../../features/chat/infrastructure/repositories/InMemoryMessageRepository.ts";
import type { Message } from "../../features/chat/domain/Message.ts";
import { MessageState } from "../../features/chat/domain/MessageState.ts";
import { InMemoryNodesRepository } from "../../features/nodes/infrastructure/repositories/InMemoryNodesRepository.ts";
import { InMemoryTelemetryRepository } from "../../features/telemetry/infrastructure/repositories/InMemoryTelemetryRepository.ts";
import { createFakeTransport } from "../testing/createFakeTransport.ts";
import { ChannelNumber } from "../types.ts";
import { MeshClient } from "./MeshClient.ts";

const NODE_A = 0x0a0a0a0a;
const NODE_B = 0x0b0b0b0b;
const UNKNOWN = -1;
const PRIMARY = { kind: "channel", channel: ChannelNumber.Primary } as const;

/**
 * Test repository that keeps one in-memory repository per scope and routes
 * every call to the one `setScope` last selected, like the sqlocal adapters
 * do with their `device_id` column.
 */
function scoped<T extends object>(initial: number, make: () => T) {
  const byScope = new Map<number, T>();
  let scope = initial;
  const at = (s: number): T => {
    let repo = byScope.get(s);
    if (!repo) {
      repo = make();
      byScope.set(s, repo);
    }
    return repo;
  };
  const repo = new Proxy({} as T & { setScope(s: number): void }, {
    get(_, prop) {
      if (prop === "setScope") return (s: number) => (scope = s);
      const target = at(scope);
      const value = Reflect.get(target, prop);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return { repo, at, scope: () => scope };
}

function message(id: number, text: string): Message {
  return {
    id,
    from: 1,
    to: 0xffffffff,
    channel: ChannelNumber.Primary,
    rxTime: new Date(id * 1000),
    type: "broadcast",
    text,
    state: MessageState.Ack,
  };
}

function battery(nodeNum: number, level: number) {
  return {
    nodeNum,
    time: new Date(level * 1000),
    kind: "deviceMetrics" as const,
    value: create(Protobuf.Telemetry.DeviceMetricsSchema, {
      batteryLevel: level,
    }),
  };
}

async function seed(
  repos: ReturnType<typeof setup>["repos"],
  scope: number,
  tag: string,
  level: number,
) {
  await repos.messages.at(scope).append(message(level, `${tag} message`));
  await repos.drafts.at(scope).save(PRIMARY, `${tag} draft`);
  await repos.nodes
    .at(scope)
    .upsert({ num: level, isFavorite: false, isIgnored: false });
  await repos.telemetry.at(scope).append(battery(42, level));
}

function setup(options: { opened: number; nodeNum?: number }) {
  const repos = {
    messages: scoped(options.opened, () => new InMemoryMessageRepository()),
    drafts: scoped(options.opened, () => new InMemoryDraftRepository()),
    nodes: scoped(options.opened, () => new InMemoryNodesRepository()),
    telemetry: scoped(options.opened, () => new InMemoryTelemetryRepository()),
  };
  const fake = createFakeTransport();
  const build = () =>
    new MeshClient({
      transport: fake.transport,
      heartbeatIntervalMs: false,
      storageScope: "node",
      storageNodeNum: options.nodeNum,
      chat: {
        repository: repos.messages.repo,
        draftRepository: repos.drafts.repo,
      },
      nodes: { repository: repos.nodes.repo },
      telemetry: { repository: repos.telemetry.repo },
    });
  return { repos, fake, build };
}

const tick = () => new Promise((r) => setTimeout(r, 10));

function view(client: MeshClient) {
  return {
    messages: client.chat.messages(ChannelNumber.Primary),
    draft: client.chat.drafts.get(PRIMARY),
    history: client.telemetry.history(42),
    latest: client.telemetry.latest(42),
  };
}

function snapshot(client: MeshClient, v: ReturnType<typeof view>) {
  return {
    messages: v.messages.value.map((m) => m.text),
    draft: v.draft.value,
    nodes: client.nodes.list.value.map((n) => n.num),
    history: v.history.value.map(
      (r) => (r.value as { batteryLevel?: number }).batteryLevel,
    ),
    latest: (v.latest.value?.value as { batteryLevel?: number } | undefined)
      ?.batteryLevel,
  };
}

describe("MeshClient storage scope", () => {
  it("rescopes to the node my_info reports and reloads everything from it", async () => {
    const { repos, fake, build } = setup({ opened: NODE_A, nodeNum: NODE_A });
    await seed(repos, NODE_A, "A", 10);
    await seed(repos, NODE_B, "B", 20);

    const client = build();
    const v = view(client);
    await tick();
    expect(snapshot(client, v)).toEqual({
      messages: ["A message"],
      draft: "A draft",
      nodes: [10],
      history: [10],
      latest: 10,
    });

    fake.respond.withMyNodeInfo({ myNodeNum: NODE_B });
    await tick();
    // The same signals now carry the new node's history.
    expect(snapshot(client, v)).toEqual({
      messages: ["B message"],
      draft: "B draft",
      nodes: [20],
      history: [20],
      latest: 20,
    });

    // Later writes land in the new scope and leave the old one alone.
    client.chat.drafts.set(PRIMARY, "B edited");
    await tick();
    expect(repos.drafts.scope()).toBe(NODE_B);
    expect(await repos.drafts.at(NODE_B).load(PRIMARY)).toBe("B edited");
    expect(await repos.drafts.at(NODE_A).load(PRIMARY)).toBe("A draft");
    expect(repos.messages.scope()).toBe(NODE_B);
    expect(repos.nodes.scope()).toBe(NODE_B);
    expect(repos.telemetry.scope()).toBe(NODE_B);
  });

  it("opens the node's history once my_info names it when the node was unknown", async () => {
    const { repos, fake, build } = setup({ opened: UNKNOWN });
    await seed(repos, NODE_A, "A", 10);

    const client = build();
    const v = view(client);
    await tick();
    expect(snapshot(client, v)).toEqual({
      messages: [],
      draft: "",
      nodes: [],
      history: [],
      latest: undefined,
    });

    fake.respond.withMyNodeInfo({ myNodeNum: NODE_A });
    await tick();
    expect(snapshot(client, v)).toEqual({
      messages: ["A message"],
      draft: "A draft",
      nodes: [10],
      history: [10],
      latest: 10,
    });
  });

  it("keeps its state when my_info reports the node it was opened for", async () => {
    const { repos, fake, build } = setup({ opened: NODE_A, nodeNum: NODE_A });
    await seed(repos, NODE_A, "A", 10);

    const client = build();
    const rescope = vi.spyOn(client, "rescopeStorage");
    client.chat.drafts.set(PRIMARY, "typing");
    fake.respond.withMyNodeInfo({ myNodeNum: NODE_A });
    // A reboot re-runs the handshake and sends my_info again.
    fake.respond.withMyNodeInfo({ myNodeNum: NODE_A });
    await tick();

    expect(rescope).not.toHaveBeenCalled();
    expect(client.chat.drafts.get(PRIMARY).value).toBe("typing");
  });

  it("rescopes once when my_info repeats a new node", async () => {
    const { fake, build } = setup({ opened: UNKNOWN });
    const client = build();
    const rescope = vi.spyOn(client, "rescopeStorage");
    fake.respond.withMyNodeInfo({ myNodeNum: NODE_A });
    fake.respond.withMyNodeInfo({ myNodeNum: NODE_A });
    await tick();
    expect(rescope).toHaveBeenCalledTimes(1);
    expect(rescope).toHaveBeenCalledWith(NODE_A);
  });

  it("drops an old-scope load that finishes after the rescope", async () => {
    const { repos, fake, build } = setup({ opened: NODE_A, nodeNum: NODE_A });
    await seed(repos, NODE_A, "A", 10);
    await seed(repos, NODE_B, "B", 20);

    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const slowA = repos.messages.at(NODE_A);
    const loadRecent = slowA.loadRecent.bind(slowA);
    slowA.loadRecent = async (key, limit) => {
      await gate;
      return loadRecent(key, limit);
    };

    const client = build();
    const messages = client.chat.messages(ChannelNumber.Primary);
    fake.respond.withMyNodeInfo({ myNodeNum: NODE_B });
    await tick();
    expect(messages.value.map((m) => m.text)).toEqual(["B message"]);

    release();
    await tick();
    expect(messages.value.map((m) => m.text)).toEqual(["B message"]);
  });

  it("refiles sent direct messages in the new scope", async () => {
    const { repos, fake, build } = setup({ opened: UNKNOWN });
    const refileA = vi.spyOn(repos.messages.at(NODE_A), "refileSentDirect");
    const refileUnknown = vi.spyOn(
      repos.messages.at(UNKNOWN),
      "refileSentDirect",
    );
    build();
    fake.respond.withMyNodeInfo({ myNodeNum: NODE_A });
    await tick();
    expect(refileA).toHaveBeenCalledWith(NODE_A);
    expect(refileUnknown).not.toHaveBeenCalled();
  });

  it("never rescopes without storageScope", async () => {
    const fake = createFakeTransport();
    const client = new MeshClient({
      transport: fake.transport,
      heartbeatIntervalMs: false,
    });
    const rescope = vi.spyOn(client, "rescopeStorage");
    fake.respond.withMyNodeInfo({ myNodeNum: NODE_A });
    await tick();
    expect(rescope).not.toHaveBeenCalled();
  });

  it("keeps working with the in-memory repositories", async () => {
    const fake = createFakeTransport();
    const client = new MeshClient({
      transport: fake.transport,
      heartbeatIntervalMs: false,
      storageScope: "node",
    });
    const messages = client.chat.messages(ChannelNumber.Primary);
    fake.respond.withMyNodeInfo({ myNodeNum: NODE_A });
    await tick();

    client.chat.drafts.set(PRIMARY, "hello");
    fake.respond.withMeshPacket(
      create(Protobuf.Mesh.MeshPacketSchema, {
        from: 7,
        to: 0xffffffff,
        id: 99,
        rxTime: 1,
        payloadVariant: {
          case: "decoded",
          value: {
            portnum: Protobuf.Portnums.PortNum.TEXT_MESSAGE_APP,
            payload: new TextEncoder().encode("hi"),
          },
        },
      }),
    );
    await tick();
    expect(messages.value.map((m) => m.text)).toEqual(["hi"]);

    // A rescope with nothing to scope reloads what the session stored.
    client.rescopeStorage(NODE_B);
    await tick();
    expect(messages.value.map((m) => m.text)).toEqual(["hi"]);
    expect(client.chat.drafts.get(PRIMARY).value).toBe("hello");
  });
});
