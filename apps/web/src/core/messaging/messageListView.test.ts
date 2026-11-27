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
  showsSignal,
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

  it("joins my own bubbles close together", () => {
    const [a] = buildTimeline([thread(message(1, ME, 0))]);
    expect(continuesRun(a, thread(message(2, ME, 3)))).toBe(true);
  });

  it("uses Android's ten-minute window, inclusive", () => {
    expect(SENDER_RUN_WINDOW_MS).toBe(10 * 60_000);
    const [a] = buildTimeline([thread(message(1, 7, 0))]);
    expect(continuesRun(a, thread(message(2, 7, 10)))).toBe(true);
    const late = message(3, 7, 10);
    expect(
      continuesRun(
        a,
        thread({ ...late, rxTime: new Date(late.rxTime.getTime() + 1) }),
      ),
    ).toBe(false);
    const [mine] = buildTimeline([thread(message(4, ME, 0))]);
    expect(continuesRun(mine, thread(message(5, ME, 11)))).toBe(false);
  });

  it("breaks on another sender, between mine and theirs, or across days", () => {
    const [a] = buildTimeline([thread(message(1, 7, 0))]);
    expect(continuesRun(a, thread(message(2, 8, 1)))).toBe(false);
    expect(continuesRun(a, thread(message(2, ME, 1)))).toBe(false);
    const [mine] = buildTimeline([thread(message(3, ME, 0))]);
    expect(continuesRun(mine, thread(message(4, 7, 1)))).toBe(false);
    expect(continuesRun(undefined, thread(message(2, 7, 1)))).toBe(false);
    // 23:55 and 00:01 are six minutes apart but on different days.
    const evening = message(5, 7, 14 * 60 + 55);
    const [late] = buildTimeline([thread(evening)]);
    expect(continuesRun(late, thread(message(6, 7, 15 * 60 + 1)))).toBe(false);
  });

  it("breaks when the clock runs backwards", () => {
    const [a] = buildTimeline([thread(message(1, 7, 5))]);
    expect(continuesRun(a, thread(message(2, 7, 4)))).toBe(false);
  });

  it("breaks after a traceroute card", () => {
    const entries = buildTimeline([thread(message(1, 7, 0))], [trace(3, 1)]);
    expect(continuesRun(entries.at(-1), thread(message(2, 7, 2)))).toBe(false);
  });
});

describe("buildTimeline", () => {
  it("marks the first bubble of each run, mine included", () => {
    const entries = buildTimeline([
      thread(message(1, 7, 0)),
      thread(message(2, 7, 1)),
      thread(message(3, 8, 2)),
      thread(message(4, ME, 3)),
      thread(message(5, ME, 4)),
      thread(message(6, 8, 5)),
    ]);
    expect(
      entries.map((e) => (e.kind === "message" ? e.startsRun : null)),
    ).toEqual([true, false, true, true, false, true]);
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

describe("showsSignal", () => {
  it("shows the signal when heard directly, else the hops", () => {
    const direct = message(1, 7, 0, { hopsAway: 0, snr: 3.5 });
    expect(showsSignal(incomingMeta(direct, { includeSignal: true }))).toBe(
      true,
    );
    const relayed = message(2, 7, 0, { hopsAway: 3, snr: 3.5 });
    expect(showsSignal(incomingMeta(relayed, { includeSignal: true }))).toBe(
      false,
    );
    const mqtt = message(3, 7, 0, { hopsAway: 0, snr: 3.5, viaMqtt: true });
    expect(showsSignal(incomingMeta(mqtt, { includeSignal: true }))).toBe(
      false,
    );
    expect(showsSignal({ viaMqtt: false, signed: false })).toBe(false);
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

  it("offers delivery details on a received message only when it names a relay", () => {
    const relayed = thread(message(3, 7, 0, { relayNode: 0x5a, hopsAway: 1 }));
    expect(actionsFor(relayed, true, undefined).deliveryDetails).toBe(true);
    const direct = thread(message(4, 7, 0, { relayNode: 0x5a, hopsAway: 0 }));
    expect(actionsFor(direct, true, undefined).deliveryDetails).toBe(false);
    const mqtt = thread(
      message(5, 7, 0, { relayNode: 0x5a, hopsAway: 1, viaMqtt: true }),
    );
    expect(actionsFor(mqtt, true, undefined).deliveryDetails).toBe(false);
  });
});
