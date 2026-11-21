import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { MessageState } from "@core/storage/types.ts";
import { describe, expect, it } from "vitest";
import { FakeKmpClient, state } from "./fakeClient.ts";
import { validateIncomingNode } from "./nodes.ts";
import { BROADCAST_NUM } from "./packets.ts";
import { MeshSession } from "./session.ts";

const ME = 0x0a0b0c0d;
const PEER = 0x11223344;

function frame(
  payloadVariant: Protobuf.Mesh.FromRadio["payloadVariant"],
): Uint8Array {
  return toBinary(
    Protobuf.Mesh.FromRadioSchema,
    create(Protobuf.Mesh.FromRadioSchema, { payloadVariant }),
  );
}

function packet(init: {
  id?: number;
  from: number;
  to: number;
  portnum: Protobuf.Portnums.PortNum;
  payload: Uint8Array;
  requestId?: number;
  rxTime?: number;
  channel?: number;
  replyId?: number;
  emoji?: number;
}): Uint8Array {
  return toBinary(
    Protobuf.Mesh.MeshPacketSchema,
    create(Protobuf.Mesh.MeshPacketSchema, {
      id: init.id ?? 1,
      from: init.from,
      to: init.to,
      channel: init.channel ?? 0,
      rxTime: init.rxTime ?? 1_700_000_000,
      payloadVariant: {
        case: "decoded",
        value: create(Protobuf.Mesh.DataSchema, {
          portnum: init.portnum,
          payload: init.payload,
          requestId: init.requestId ?? 0,
          replyId: init.replyId ?? 0,
          emoji: init.emoji ?? 0,
        }),
      },
    }),
  );
}

const text = (from: number, to: number, body: string, id = 1): Uint8Array =>
  packet({
    id,
    from,
    to,
    portnum: Protobuf.Portnums.PortNum.TEXT_MESSAGE_APP,
    payload: new TextEncoder().encode(body),
  });

const reactionPacket = (
  from: number,
  to: number,
  targetId: number,
  emoji: string,
  id = 50,
): Uint8Array =>
  packet({
    id,
    from,
    to,
    portnum: Protobuf.Portnums.PortNum.TEXT_MESSAGE_APP,
    payload: new TextEncoder().encode(emoji),
    replyId: targetId,
    emoji: 1,
  });

const ack = (
  from: number,
  requestId: number,
  error = Protobuf.Mesh.Routing_Error.NONE,
): Uint8Array =>
  packet({
    id: 900 + requestId,
    from,
    to: ME,
    requestId,
    portnum: Protobuf.Portnums.PortNum.ROUTING_APP,
    payload: toBinary(
      Protobuf.Mesh.RoutingSchema,
      create(Protobuf.Mesh.RoutingSchema, {
        variant: { case: "errorReason", value: error },
      }),
    ),
  });

const nodeInfo = (num: number, publicKey?: Uint8Array): Uint8Array =>
  toBinary(
    Protobuf.Mesh.NodeInfoSchema,
    create(Protobuf.Mesh.NodeInfoSchema, {
      num,
      user: create(Protobuf.Mesh.UserSchema, {
        longName: `node ${num}`,
        publicKey,
      }),
    }),
  );

function connected(): { kmp: FakeKmpClient; session: MeshSession } {
  const kmp = new FakeKmpClient();
  const session = new MeshSession(kmp);
  kmp.setState(state("configuring"));
  kmp.emitFrame(
    frame({
      case: "myInfo",
      value: create(Protobuf.Mesh.MyNodeInfoSchema, { myNodeNum: ME }),
    }),
  );
  kmp.setState(state("connected"));
  return { kmp, session };
}

describe("MeshSession", () => {
  it("resolves the own node from the SDK's state when its handshake frames did not reach the web", () => {
    const kmp = new FakeKmpClient();
    const session = new MeshSession(kmp);
    kmp.myNodeNum = ME;
    kmp.ownNode = toBinary(
      Protobuf.Mesh.NodeInfoSchema,
      create(Protobuf.Mesh.NodeInfoSchema, {
        num: ME,
        user: { longName: "Me", shortName: "ME" },
      }),
    );
    kmp.setState(state("configuring"));

    kmp.setState(state("connected"));

    expect(session.device.myNodeNum.peek()).toBe(ME);
    expect(session.nodes.byNum(ME)?.user?.longName).toBe("Me");
  });

  it("fills in the own node's user from the owner the SDK fetched at Ready", () => {
    const { kmp, session } = connected();
    const owner = create(Protobuf.Admin.AdminMessageSchema, {
      payloadVariant: {
        case: "getOwnerResponse",
        value: create(Protobuf.Mesh.UserSchema, {
          id: "!0a0b0c0d",
          longName: "Owner",
          shortName: "OWN",
        }),
      },
    });
    kmp.emitPacket(
      toBinary(
        Protobuf.Mesh.MeshPacketSchema,
        create(Protobuf.Mesh.MeshPacketSchema, {
          from: ME,
          to: ME,
          id: 7,
          payloadVariant: {
            case: "decoded",
            value: create(Protobuf.Mesh.DataSchema, {
              portnum: Protobuf.Portnums.PortNum.ADMIN_APP,
              payload: toBinary(Protobuf.Admin.AdminMessageSchema, owner),
            }),
          },
        }),
      ),
    );

    expect(session.nodes.byNum(ME)?.user?.longName).toBe("Owner");
  });

  it("reads the handshake into the device view and the progress counters", () => {
    const kmp = new FakeKmpClient();
    const session = new MeshSession(kmp);
    kmp.setState(state("configuring"));
    kmp.emitFrame(
      frame({
        case: "myInfo",
        value: create(Protobuf.Mesh.MyNodeInfoSchema, { myNodeNum: ME }),
      }),
    );
    kmp.emitFrame(
      frame({
        case: "metadata",
        value: create(Protobuf.Mesh.DeviceMetadataSchema, {
          firmwareVersion: "2.8.3.abcdef",
        }),
      }),
    );
    kmp.emitFrame(
      frame({
        case: "config",
        value: create(Protobuf.Config.ConfigSchema, {
          payloadVariant: {
            case: "lora",
            value: create(Protobuf.Config.Config_LoRaConfigSchema, {
              region: Protobuf.Config.Config_LoRaConfig_RegionCode.UNSET,
            }),
          },
        }),
      }),
    );
    kmp.emitFrame(
      frame({
        case: "channel",
        value: create(Protobuf.Channel.ChannelSchema, {
          index: 0,
          role: Protobuf.Channel.Channel_Role.PRIMARY,
        }),
      }),
    );
    expect(session.progress.value).toEqual({
      phase: "configuring",
      received: {
        config: 1,
        modules: 0,
        channels: 1,
        nodes: 0,
        myInfo: true,
        metadata: true,
      },
    });
    expect(session.device.myNodeNum.value).toBe(ME);
    expect(session.device.metadata.value?.firmwareVersion).toBe("2.8.3.abcdef");
    expect(session.device.firmwareSupport.value).toBe("supported");
    expect(session.config.isRegionUnset.value).toBe(true);
    expect(session.channels.list.value.map((c) => c.index)).toEqual([0]);

    kmp.setState(state("connected"));
    expect(session.progress.value.phase).toBe("configured");
    expect(session.device.isConfigured.value).toBe(true);
  });

  it("files inbound text under its conversation and counts it unread", () => {
    const { kmp, session } = connected();
    const direct = session.chat.direct(PEER);
    const channel = session.chat.messages(0);

    kmp.emitPacket(text(PEER, ME, "hi", 10));
    kmp.emitPacket(text(PEER, BROADCAST_NUM, "all", 11));

    expect(direct.value.map((m) => m.text)).toEqual(["hi"]);
    expect(channel.value.map((m) => m.text)).toEqual(["all"]);
    expect(direct.value[0]?.state).toBe(MessageState.Ack);
    expect(session.chat.unread.total.value).toBe(2);
    expect(session.chat.unread.byKey.value.get(`direct:${PEER}`)).toBe(1);

    session.chat.unread.markRead({ kind: "direct", peer: PEER });
    expect(session.chat.unread.total.value).toBe(1);
  });

  it("clears the active conversation and doesn't count text arriving in it", () => {
    const { kmp, session } = connected();
    kmp.emitPacket(text(PEER, ME, "before", 10));
    kmp.emitPacket(text(PEER, BROADCAST_NUM, "all", 11));

    session.chat.unread.setActive({ kind: "direct", peer: PEER });
    expect(session.chat.unread.byKey.value.has(`direct:${PEER}`)).toBe(false);

    kmp.emitPacket(text(PEER, ME, "while open", 12));
    expect(session.chat.unread.byKey.value.has(`direct:${PEER}`)).toBe(false);
    expect(session.chat.unread.byKey.value.get("channel:0")).toBe(1);

    session.chat.unread.setActive(undefined);
    kmp.emitPacket(text(PEER, ME, "after", 13));
    expect(session.chat.unread.byKey.value.get(`direct:${PEER}`)).toBe(1);
  });

  it("sends text under the SDK's packet id and settles it from the routing ack", async () => {
    const { kmp, session } = connected();
    kmp.holdSends = true;
    const direct = session.chat.direct(PEER);

    const sending = session.chat.send({ text: "yo", destination: PEER });
    const id = kmp.texts[0]?.id;
    expect(id).toBeDefined();
    expect(direct.value.map((m) => [m.id, m.state])).toEqual([
      [id, MessageState.Pending],
    ]);

    kmp.emitPacket(ack(PEER, id ?? 0));
    expect(direct.value[0]?.state).toBe(MessageState.Ack);
    expect(direct.value[0]?.relays).toBe(1);

    kmp.settleSends({ ok: true, reason: null });
    const result = await sending;
    expect(result.status).toBe("ok");
    expect(direct.value[0]?.state).toBe(MessageState.Ack);
  });

  it("marks a send the SDK gave up on as failed with the routing error", async () => {
    const { kmp, session } = connected();
    kmp.sendOutcome = { ok: false, reason: "NO_CHANNEL" };
    const channel = session.chat.messages(0);
    const result = await session.chat.send({
      text: "x",
      destination: "broadcast",
      channel: 0,
    });
    expect(result.status).toBe("error");
    expect(channel.value[0]).toMatchObject({
      state: MessageState.Failed,
      routingError: Protobuf.Mesh.Routing_Error.NO_CHANNEL,
    });
  });

  it("keeps an ack that beat the send's id and marks a relay ack as delivered", async () => {
    const { kmp, session } = connected();
    kmp.holdSends = true;
    const channel = session.chat.messages(0);
    kmp.emitPacket(ack(0x55, 1));
    const sending = session.chat.send({ text: "x", destination: "broadcast" });
    expect(channel.value[0]?.state).toBe(MessageState.Delivered);
    kmp.settleSends();
    await sending;
    expect(channel.value[0]?.state).toBe(MessageState.Delivered);
  });

  it("marks my messages outgoing once the handshake names my node", () => {
    const kmp = new FakeKmpClient();
    const session = new MeshSession(kmp);
    const thread = session.chat.thread({ kind: "channel", channel: 0 });
    kmp.setState(state("configuring"));
    kmp.emitPacket(text(ME, BROADCAST_NUM, "from me", 10));
    expect(thread.value[0]?.outgoing).toBe(false);

    kmp.emitFrame(
      frame({
        case: "myInfo",
        value: create(Protobuf.Mesh.MyNodeInfoSchema, { myNodeNum: ME }),
      }),
    );
    expect(thread.value[0]?.outgoing).toBe(true);
    expect(thread.value[0]?.delivery).toBeDefined();
  });

  it("files an inbound tapback as a reaction, not a message", () => {
    const { kmp, session } = connected();
    const seen: string[] = [];
    session.events.onMessagePacket.subscribe((p) => seen.push(p.data));
    const thread = session.chat.thread({ kind: "channel", channel: 0 });
    kmp.emitPacket(text(PEER, BROADCAST_NUM, "lunch?", 10));
    kmp.emitPacket(reactionPacket(PEER, BROADCAST_NUM, 10, "👍", 11));
    kmp.emitPacket(reactionPacket(0x55, BROADCAST_NUM, 10, "👍", 12));
    kmp.emitPacket(reactionPacket(0x55, BROADCAST_NUM, 10, "👍", 12));

    expect(thread.value.map((t) => t.message.text)).toEqual(["lunch?"]);
    expect(thread.value[0]?.reactions).toEqual([
      { emoji: "👍", count: 2, mine: false, fromNodes: [PEER, 0x55] },
    ]);
    expect(session.chat.unread.total.value).toBe(1);
    expect(seen).toEqual(["lunch?"]);
  });

  it("resolves an inbound reply against the message it quotes", () => {
    const { kmp, session } = connected();
    const thread = session.chat.thread({ kind: "direct", peer: PEER });
    kmp.emitPacket(text(PEER, ME, "where?", 10));
    kmp.emitPacket(
      packet({
        id: 11,
        from: PEER,
        to: ME,
        portnum: Protobuf.Portnums.PortNum.TEXT_MESSAGE_APP,
        payload: new TextEncoder().encode("the park"),
        replyId: 10,
      }),
    );
    expect(thread.value[1]?.replyTo).toEqual({
      kind: "resolved",
      id: 10,
      from: PEER,
      excerpt: "where?",
    });
  });

  it("sends a reply through sendText with its reply id", async () => {
    const { kmp, session } = connected();
    const thread = session.chat.thread({ kind: "direct", peer: PEER });
    kmp.emitPacket(text(PEER, ME, "where?", 10));
    const result = await session.chat.sendText({
      text: "here",
      destination: PEER,
      replyId: 10,
    });
    expect(result.status).toBe("ok");
    expect(kmp.texts[0]).toMatchObject({ text: "here", to: PEER, replyId: 10 });
    expect(thread.value[1]).toMatchObject({
      outgoing: true,
      replyTo: { kind: "resolved", id: 10 },
      delivery: { kind: "pending", relayed: true },
    });
  });

  it("sends a reaction packet, shows it as mine and tracks its delivery", async () => {
    const { kmp, session } = connected();
    kmp.holdSends = true;
    const thread = session.chat.thread({ kind: "channel", channel: 1 });
    kmp.emitPacket(
      packet({
        id: 10,
        from: PEER,
        to: BROADCAST_NUM,
        channel: 1,
        portnum: Protobuf.Portnums.PortNum.TEXT_MESSAGE_APP,
        payload: new TextEncoder().encode("hi"),
      }),
    );

    const sending = session.chat.sendReaction({
      targetId: 10,
      emoji: "❤️",
      destination: "broadcast",
      channel: 1,
    });
    const sent = fromBinary(
      Protobuf.Mesh.MeshPacketSchema,
      kmp.packets[0] ?? new Uint8Array(),
    );
    expect(sent).toMatchObject({
      to: BROADCAST_NUM,
      channel: 1,
      wantAck: true,
    });
    expect(sent.payloadVariant).toMatchObject({
      case: "decoded",
      value: { replyId: 10, emoji: 1 },
    });
    // The fake SDK numbers sends from 1.
    const packetId = 1;
    expect(thread.value[0]?.reactions).toEqual([
      {
        emoji: "❤️",
        count: 1,
        mine: true,
        fromNodes: [ME],
        own: { packetId, state: MessageState.Pending },
      },
    ]);

    kmp.settleSends({ ok: false, reason: "MAX_RETRANSMIT" });
    const result = await sending;
    expect(result.status).toBe("error");
    expect(thread.value[0]?.reactions[0]?.own).toEqual({
      packetId,
      state: MessageState.Failed,
    });

    kmp.holdSends = false;
    const retried = await session.chat.retry(packetId);
    expect(retried.status).toBe("ok");
    expect(kmp.packets).toHaveLength(2);
    expect(thread.value[0]?.reactions).toMatchObject([
      { count: 1, own: { state: MessageState.Delivered } },
    ]);
  });

  it("acks a DM reaction from its recipient and keeps it acked", async () => {
    const { kmp, session } = connected();
    kmp.holdSends = true;
    const thread = session.chat.thread({ kind: "direct", peer: PEER });
    kmp.emitPacket(text(PEER, ME, "hi", 10));
    const sending = session.chat.sendReaction({
      targetId: 10,
      emoji: "👍",
      destination: PEER,
    });
    const id = 1;
    kmp.emitPacket(ack(PEER, id));
    expect(thread.value[0]?.reactions[0]?.own?.state).toBe(MessageState.Ack);
    kmp.emitPacket(ack(0x55, id, Protobuf.Mesh.Routing_Error.TIMEOUT));
    expect(thread.value[0]?.reactions[0]?.own?.state).toBe(MessageState.Ack);
    kmp.settleSends({ ok: true, reason: null });
    await sending;
    expect(thread.value[0]?.reactions[0]?.own?.state).toBe(MessageState.Ack);
  });

  it("replays an ack that beat the reaction's send", async () => {
    const { kmp, session } = connected();
    kmp.holdSends = true;
    const thread = session.chat.thread({ kind: "direct", peer: PEER });
    kmp.emitPacket(text(PEER, ME, "hi", 10));
    kmp.emitPacket(ack(PEER, 1));
    const sending = session.chat.sendReaction({
      targetId: 10,
      emoji: "👍",
      destination: PEER,
    });
    expect(thread.value[0]?.reactions[0]?.own).toEqual({
      packetId: 1,
      state: MessageState.Ack,
    });
    kmp.settleSends();
    await sending;
  });

  it("counts a packet delivered twice once, even in an unopened conversation", () => {
    const { kmp, session } = connected();
    kmp.emitPacket(text(PEER, ME, "hi", 10));
    kmp.emitPacket(text(PEER, ME, "hi", 10));
    kmp.emitPacket(reactionPacket(PEER, ME, 10, "👍", 11));
    kmp.emitPacket(reactionPacket(PEER, ME, 10, "👍", 11));
    expect(session.chat.unread.total.value).toBe(1);
    expect(
      session.chat.summaries.value.get(`direct:${PEER}`)?.lastMessage?.id,
    ).toBe(10);
  });

  it("toggles off my reaction whatever spacing or VS16 variant is clicked", async () => {
    const { kmp, session } = connected();
    const thread = session.chat.thread({ kind: "direct", peer: PEER });
    kmp.emitPacket(text(PEER, ME, "hi", 10));
    const added = await session.chat.toggleReaction({
      targetId: 10,
      emoji: " ❤️ ",
      destination: PEER,
    });
    expect(added.status).toBe("ok");
    expect(thread.value[0]?.reactions[0]?.emoji).toBe("❤️");
    const removed = await session.chat.toggleReaction({
      targetId: 10,
      emoji: "❤",
      destination: PEER,
    });
    expect(removed.isOk() && removed.value).toEqual({ action: "removed" });
    expect(thread.value[0]?.reactions).toEqual([]);
    const blank = await session.chat.toggleReaction({
      targetId: 10,
      emoji: " \uFE0F ",
      destination: PEER,
    });
    expect(blank.isErr() && blank.error.reason).toBe("empty-reaction");
  });

  it("toggles my reaction off locally without sending anything", async () => {
    const { kmp, session } = connected();
    const thread = session.chat.thread({ kind: "direct", peer: PEER });
    kmp.emitPacket(text(PEER, ME, "hi", 10));
    const input = {
      targetId: 10,
      emoji: "👍",
      destination: PEER,
    };

    const added = await session.chat.toggleReaction(input);
    expect(added.status).toBe("ok");
    expect(thread.value[0]?.reactions[0]?.mine).toBe(true);
    expect(kmp.packets).toHaveLength(1);

    const removed = await session.chat.toggleReaction(input);
    expect(removed.isOk() && removed.value).toEqual({ action: "removed" });
    expect(thread.value[0]?.reactions).toEqual([]);
    expect(kmp.packets).toHaveLength(1);
  });

  it("retries a failed message with its reply and refuses others", async () => {
    const { kmp, session } = connected();
    const direct = session.chat.direct(PEER);
    kmp.sendOutcome = { ok: false, reason: "TIMEOUT" };
    const first = await session.chat.sendText({
      text: "again",
      destination: PEER,
      replyId: 3,
    });
    const failedId = first.isErr() ? (kmp.texts[0]?.id ?? 0) : 0;
    expect(direct.value[0]?.state).toBe(MessageState.Failed);

    kmp.sendOutcome = { ok: true, reason: null };
    const retried = await session.chat.retry(failedId);
    expect(retried.status).toBe("ok");
    expect(kmp.texts[1]).toMatchObject({ text: "again", replyId: 3 });
    expect(direct.value.map((m) => m.id)).toEqual([kmp.texts[1]?.id]);

    const again = await session.chat.retry(kmp.texts[1]?.id ?? 0);
    expect(again.isErr() && again.error.reason).toBe("not-failed");
    const missing = await session.chat.retry(12345);
    expect(missing.isErr() && missing.error.reason).toBe("not-found");
  });

  it("keeps conversation summaries for the sidebar", () => {
    const { kmp, session } = connected();
    kmp.emitPacket(text(PEER, ME, "first", 10));
    kmp.emitPacket(text(PEER, ME, "second", 11));
    const summary = session.chat.summaries.value.get(`direct:${PEER}`);
    expect(summary).toMatchObject({
      unread: 2,
      lastMessage: { text: "second" },
    });
    session.chat.markRead({ kind: "direct", peer: PEER });
    expect(session.chat.summaries.value.get(`direct:${PEER}`)?.unread).toBe(0);
  });

  it("mirrors the SDK's node DB and refuses a node presenting another node's key", async () => {
    const { kmp, session } = connected();
    const key = new Uint8Array([1, 2, 3]);
    kmp.emitNodeChange({
      kind: "snapshot",
      nodes: [nodeInfo(PEER, key), nodeInfo(0x99)],
      node: null,
      nodeNum: 0,
    });
    expect(session.nodes.list.value.map((n) => n.num)).toEqual([PEER, 0x99]);

    kmp.emitNodeChange({
      kind: "added",
      nodes: null,
      node: nodeInfo(0x77, key),
      nodeNum: 0x77,
    });
    expect(session.nodes.byNum(0x77)).toBeUndefined();
    expect(session.nodes.errors.value).toEqual([
      { node: 0x77, error: "DUPLICATE_PKI" },
    ]);

    kmp.emitNodeChange({
      kind: "removed",
      nodes: null,
      node: null,
      nodeNum: 0x99,
    });
    await Promise.resolve();
    expect(session.nodes.list.value.map((n) => n.num)).toEqual([PEER]);
  });

  it("refreshes lastHeard, position and status from live packets", () => {
    const { kmp, session } = connected();
    kmp.emitPacket(
      packet({
        from: PEER,
        to: BROADCAST_NUM,
        rxTime: 1_700_000_123,
        portnum: Protobuf.Portnums.PortNum.POSITION_APP,
        payload: toBinary(
          Protobuf.Mesh.PositionSchema,
          create(Protobuf.Mesh.PositionSchema, { latitudeI: 5 }),
        ),
      }),
    );
    kmp.emitPacket(
      packet({
        from: PEER,
        to: BROADCAST_NUM,
        rxTime: 1_700_000_123,
        portnum: Protobuf.Portnums.PortNum.NODE_STATUS_APP,
        payload: toBinary(
          Protobuf.Mesh.StatusMessageSchema,
          create(Protobuf.Mesh.StatusMessageSchema, { status: "busy" }),
        ),
      }),
    );
    const node = session.nodes.byNum(PEER);
    expect(node?.lastHeard).toBe(1_700_000_123);
    expect(node?.position?.latitudeI).toBe(5);
    expect(node?.status).toBe("busy");
  });

  it("records a routing error against the node and raises it as a node error", () => {
    const { kmp, session } = connected();
    kmp.emitPacket(
      ack(PEER, 5, Protobuf.Mesh.Routing_Error.PKI_UNKNOWN_PUBKEY),
    );
    expect(session.nodes.errors.value).toEqual([
      { node: PEER, error: Protobuf.Mesh.Routing_Error.PKI_UNKNOWN_PUBKEY },
    ]);
  });

  it("keeps telemetry history per node and folds device metrics into the node", () => {
    const { kmp, session } = connected();
    const history = session.telemetry.history(PEER);
    kmp.emitPacket(
      packet({
        from: PEER,
        to: BROADCAST_NUM,
        portnum: Protobuf.Portnums.PortNum.TELEMETRY_APP,
        payload: toBinary(
          Protobuf.Telemetry.TelemetrySchema,
          create(Protobuf.Telemetry.TelemetrySchema, {
            variant: {
              case: "deviceMetrics",
              value: create(Protobuf.Telemetry.DeviceMetricsSchema, {
                batteryLevel: 42,
              }),
            },
          }),
        ),
      }),
    );
    expect(history.value.map((r) => r.kind)).toEqual(["deviceMetrics"]);
    expect(session.nodes.byNum(PEER)?.deviceMetrics?.batteryLevel).toBe(42);
  });

  it("keeps beacon offers newest first, one per sender, and drops dismissed ones", () => {
    const { kmp, session } = connected();
    const beacon = (from: number, name: string) =>
      packet({
        from,
        to: BROADCAST_NUM,
        portnum: Protobuf.Portnums.PortNum.MESH_BEACON_APP,
        payload: toBinary(
          Protobuf.MeshBeacon.MeshBeaconSchema,
          create(Protobuf.MeshBeacon.MeshBeaconSchema, {
            offerChannel: create(Protobuf.Channel.ChannelSettingsSchema, {
              name,
            }),
          }),
        ),
      });
    kmp.emitPacket(beacon(PEER, "a"));
    kmp.emitPacket(beacon(0x66, "b"));
    kmp.emitPacket(beacon(PEER, "c"));
    kmp.emitPacket(beacon(ME, "mine"));
    expect(
      session.channels.beaconOffers.value.map(
        (o) => o.beacon.offerChannel?.name,
      ),
    ).toEqual(["c", "b"]);
    session.channels.dismissBeaconOffer(PEER);
    expect(session.channels.beaconOffers.value.map((o) => o.from)).toEqual([
      0x66,
    ]);
  });

  it("sends the lockdown passphrase and re-runs the handshake once unlocked", async () => {
    const { kmp, session } = connected();
    kmp.emitFrame(
      frame({
        case: "lockdownStatus",
        value: create(Protobuf.Mesh.LockdownStatusSchema, {
          state: Protobuf.Mesh.LockdownStatus_State.LOCKED,
        }),
      }),
    );
    expect(session.device.isLocked.value).toBe(true);
    await session.device.unlock({ passphrase: "open sesame" });
    expect(kmp.admin().sent).toHaveLength(1);

    kmp.emitFrame(
      frame({
        case: "lockdownStatus",
        value: create(Protobuf.Mesh.LockdownStatusSchema, {
          state: Protobuf.Mesh.LockdownStatus_State.UNLOCKED,
        }),
      }),
    );
    expect(session.device.isLocked.value).toBe(false);
    await Promise.resolve();
    expect(kmp.disconnects).toHaveLength(1);
  });

  it("does not reconnect when closed and disconnected during a handshake cycle", async () => {
    const { kmp, session } = connected();
    kmp.holdDisconnects = true;
    const cycle = session.rehandshake();
    expect(kmp.disconnects).toHaveLength(1);

    session.close();
    const closing = session.disconnect();
    kmp.holdDisconnects = false;
    kmp.settleDisconnects();
    await cycle;
    await closing;

    expect(kmp.connects).toHaveLength(0);
    expect(kmp.connectionState.kind).toBe("disconnected");
  });
});

describe("validateIncomingNode", () => {
  const key = new Uint8Array([9, 9, 9]);
  const node = (num: number, publicKey?: Uint8Array) => ({
    num,
    isFavorite: false,
    isIgnored: false,
    user: create(Protobuf.Mesh.UserSchema, { publicKey }),
  });

  it("rejects a key change as MISMATCH_PKI and drops a keyless update", () => {
    const existing = new Map([[1, node(1, key)]]);
    const changed = create(Protobuf.Mesh.NodeInfoSchema, {
      num: 1,
      user: { publicKey: new Uint8Array([1]) },
    });
    expect(validateIncomingNode(changed, existing)).toEqual({
      accepted: undefined,
      error: "MISMATCH_PKI",
    });
    const keyless = create(Protobuf.Mesh.NodeInfoSchema, { num: 1 });
    expect(validateIncomingNode(keyless, existing)).toEqual({
      accepted: undefined,
      error: undefined,
    });
  });
});
