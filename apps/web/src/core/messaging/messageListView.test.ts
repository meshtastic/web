import { Protobuf } from "@core/protobuf.ts";
import { type Message, MessageState } from "@core/storage/types.ts";
import { describe, expect, it } from "vitest";
import {
  actionsFor,
  buildTimeline,
  continuesRun,
  groupTimeline,
  incomingMeta,
  messageKey,
  SENDER_RUN_WINDOW_MS,
} from "./messageListView.ts";
import type { ThreadMessage } from "./thread.ts";
import type { TracerouteView } from "./tracerouteView.ts";

const ME = 1;
const BASE = new Date(2026, 10, 21, 9, 0, 0).getTime();

const message = (
  id: number,
  from: number,
  minutes: number,
  extra: Partial<Message> = {},
): Message => ({
  id,
  from,
  to: 0xffffffff,
  channel: 0,
  rxTime: new Date(BASE + minutes * 60_000),
  type: "broadcast",
  text: `text ${id}`,
  state: MessageState.Ack,
  ...extra,
});

const thread = (m: Message): ThreadMessage => ({
  message: m,
  outgoing: m.from === ME,
  reactions: [],
  ...(m.from === ME ? { delivery: { kind: "delivered" } } : {}),
});

const trace = (id: number, minutes: number): TracerouteView => ({
  id,
  from: 7,
  at: new Date(BASE + minutes * 60_000),
  path: [ME, 7],
  snrTowards: [],
  pathBack: [],
  snrBack: [],
  sameReturn: false,
});

describe("messageKey", () => {
  it("combines sender and packet id", () => {
    expect(messageKey({ id: 5, from: 9 })).toBe("9:5");
  });
});

describe("continuesRun", () => {
  it("joins incoming bubbles from the same sender close together", () => {
    const [a] = buildTimeline([thread(message(1, 7, 0))]);
    expect(continuesRun(a, thread(message(2, 7, 2)))).toBe(true);
  });

  it("breaks on another sender, a long gap or an outgoing bubble", () => {
    const [a] = buildTimeline([thread(message(1, 7, 0))]);
    expect(continuesRun(a, thread(message(2, 8, 1)))).toBe(false);
    expect(
      continuesRun(a, thread(message(2, 7, SENDER_RUN_WINDOW_MS / 60_000 + 1))),
    ).toBe(false);
    expect(continuesRun(a, thread(message(2, ME, 1)))).toBe(false);
    expect(continuesRun(undefined, thread(message(2, 7, 1)))).toBe(false);
  });

  it("breaks after a traceroute card", () => {
    const entries = buildTimeline([thread(message(1, 7, 0))], [trace(3, 1)]);
    expect(continuesRun(entries.at(-1), thread(message(2, 7, 2)))).toBe(false);
  });
});

describe("buildTimeline", () => {
  it("marks the first bubble of each run to show its sender", () => {
    const entries = buildTimeline([
      thread(message(1, 7, 0)),
      thread(message(2, 7, 1)),
      thread(message(3, 8, 2)),
      thread(message(4, ME, 3)),
      thread(message(5, 8, 4)),
    ]);
    expect(
      entries.map((e) => (e.kind === "message" ? e.showSender : null)),
    ).toEqual([true, false, true, true, true]);
  });

  it("merges traceroutes by time, after messages at the same instant", () => {
    const entries = buildTimeline(
      [thread(message(1, ME, 0)), thread(message(2, 7, 5))],
      [trace(30, 0), trace(31, 2), trace(32, 9)],
    );
    expect(entries.map((e) => e.key)).toEqual([
      "1:1",
      "trace:7:30",
      "trace:7:31",
      "7:2",
      "trace:7:32",
    ]);
  });

  it("sorts traceroutes given out of order", () => {
    const entries = buildTimeline([], [trace(2, 5), trace(1, 1)]);
    expect(entries.map((e) => e.key)).toEqual(["trace:7:1", "trace:7:2"]);
  });
});

describe("groupTimeline", () => {
  it("starts a group per calendar day", () => {
    const day = 24 * 60;
    const groups = groupTimeline(
      buildTimeline([
        thread(message(1, 7, 0)),
        thread(message(2, 7, 1)),
        thread(message(3, 7, day)),
      ]),
    );
    expect(groups.map((g) => g.items.length)).toEqual([2, 1]);
  });
});

describe("incomingMeta", () => {
  it("reports hops, and signal only when asked and heard directly", () => {
    const direct = message(1, 7, 0, { hopsAway: 0, snr: -9, rssi: -112 });
    expect(incomingMeta(direct, { includeSignal: true })).toEqual({
      hops: 0,
      snr: -9,
      snrQuality: "good",
      rssi: -112,
      rssiQuality: "good",
      viaMqtt: false,
      signed: false,
    });
    expect(incomingMeta(direct, { includeSignal: false })).toEqual({
      hops: 0,
      viaMqtt: false,
      signed: false,
    });
    const relayed = message(2, 7, 0, { hopsAway: 2, snr: -3 });
    expect(incomingMeta(relayed, { includeSignal: true }).snr).toBeUndefined();
  });

  it("calls out MQTT, UDP and API transports and signatures", () => {
    const T = Protobuf.Mesh.MeshPacket_TransportMechanism;
    expect(
      incomingMeta(message(1, 7, 0, { viaMqtt: true, hopsAway: 0, snr: 1 }), {
        includeSignal: true,
      }),
    ).toEqual({ hops: 0, viaMqtt: true, signed: false, transport: "mqtt" });
    expect(
      incomingMeta(message(1, 7, 0, { transport: T.TRANSPORT_MULTICAST_UDP }), {
        includeSignal: false,
      }).transport,
    ).toBe("udp");
    expect(
      incomingMeta(message(1, 7, 0, { transport: T.TRANSPORT_API }), {
        includeSignal: false,
      }).transport,
    ).toBe("api");
    expect(
      incomingMeta(message(1, 7, 0, { signed: true }), {
        includeSignal: false,
      }).signed,
    ).toBe(true);
  });
});

describe("actionsFor", () => {
  it("offers retry only on a failed outgoing message while connected", () => {
    const failed: ThreadMessage = {
      ...thread(message(1, ME, 0, { state: MessageState.Failed })),
      delivery: { kind: "failed" },
    };
    const retryable = { kind: "failed", retryable: true } as const;
    expect(actionsFor(failed, true, retryable)).toEqual({
      react: true,
      reply: true,
      copy: true,
      deliveryDetails: true,
      retry: true,
    });
    expect(actionsFor(failed, false, retryable).retry).toBe(false);
    expect(actionsFor(failed, false, retryable).react).toBe(false);
    expect(
      actionsFor(failed, true, { kind: "failed", retryable: false }).retry,
    ).toBe(false);
    const incoming = thread(message(2, 7, 0, { text: "" }));
    expect(actionsFor(incoming, true, undefined)).toMatchObject({
      copy: false,
      deliveryDetails: false,
      retry: false,
    });
  });
});
