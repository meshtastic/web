import { Protobuf } from "@core/protobuf.ts";
import { describe, expect, it } from "vitest";
import {
  packetRelayNode,
  type RelayCandidate,
  relayByte,
  relayHex,
  relayNodeLabel,
  resolveRelayNode,
  shownRelayNode,
} from "./relayNode.ts";

const ME = 0x1234_5600 + 0x5a;
const Transport = Protobuf.Mesh.MeshPacket_TransportMechanism;

const node = (
  num: number,
  extra: Partial<RelayCandidate> & { name?: string } = {},
): RelayCandidate => {
  const { name, ...rest } = extra;
  return {
    num,
    lastHeard: 1_000,
    ...(name === undefined ? {} : { user: { longName: name } }),
    ...rest,
  };
};

describe("relayByte", () => {
  it("keeps only the last byte", () => {
    expect(relayByte(0x1234_565a)).toBe(0x5a);
    expect(relayByte(0x5a)).toBe(0x5a);
  });

  it("names no relay for 0 or a missing byte", () => {
    expect(relayByte(0)).toBeUndefined();
    expect(relayByte(undefined)).toBeUndefined();
    // A node whose number ends in 00 can't be told from "no relay".
    expect(relayByte(0xabcd_ef00)).toBeUndefined();
  });

  it("formats as two upper-case hex digits", () => {
    expect(relayHex(0x5a)).toBe("0x5A");
    expect(relayHex(0x0b)).toBe("0x0B");
  });
});

describe("resolveRelayNode", () => {
  it("picks the one node ending in the byte", () => {
    const ridge = node(0xaaaa_aa5a, { name: "Ridge" });
    expect(resolveRelayNode(0x5a, [node(0xaaaa_aa5b), ridge], undefined)).toBe(
      ridge,
    );
  });

  it("finds nothing when no known node ends in the byte", () => {
    expect(
      resolveRelayNode(0x5a, [node(0xaaaa_aa5b)], undefined),
    ).toBeUndefined();
  });

  it("finds nothing for 0, even with a node ending in 00", () => {
    expect(resolveRelayNode(0, [node(0xaaaa_aa00)], undefined)).toBeUndefined();
  });

  it("never names our own node", () => {
    expect(resolveRelayNode(0x5a, [node(ME)], ME)).toBeUndefined();
    const other = node(0xbbbb_bb5a, { hopsAway: 3 });
    expect(resolveRelayNode(0x5a, [node(ME, { hopsAway: 0 }), other], ME)).toBe(
      other,
    );
  });

  it("skips nodes that were never heard", () => {
    expect(
      resolveRelayNode(0x5a, [node(0xaaaa_aa5a, { lastHeard: 0 })], undefined),
    ).toBeUndefined();
  });

  it("prefers the fewest hops when several match", () => {
    const near = node(0xbbbb_bb5a, { hopsAway: 1 });
    expect(
      resolveRelayNode(
        0x5a,
        [node(0xaaaa_aa5a, { hopsAway: 3 }), near],
        undefined,
      ),
    ).toBe(near);
  });

  it("ranks unknown hops after every known hop count", () => {
    const known = node(0xbbbb_bb5a, { hopsAway: 6 });
    expect(
      resolveRelayNode(
        0x5a,
        [node(0xaaaa_aa5a), node(0xcccc_cc5a, { hopsAway: -1 }), known],
        undefined,
      ),
    ).toBe(known);
  });

  it("breaks a hop tie by the most recently heard", () => {
    const recent = node(0xbbbb_bb5a, { hopsAway: 2, lastHeard: 5_000 });
    expect(
      resolveRelayNode(
        0x5a,
        [node(0xaaaa_aa5a, { hopsAway: 2, lastHeard: 4_000 }), recent],
        undefined,
      ),
    ).toBe(recent);
    // Unknown hops on every match: the most recently heard still wins.
    const latest = node(0xdddd_dd5a, { lastHeard: 9_000 });
    expect(resolveRelayNode(0x5a, [node(0xcccc_cc5a), latest], undefined)).toBe(
      latest,
    );
  });
});

describe("relayNodeLabel", () => {
  it("names the match and keeps the byte", () => {
    expect(
      relayNodeLabel(0x5a, [node(0xaaaa_aa5a, { name: "Ridge" })], undefined),
    ).toBe("Ridge (0x5A)");
  });

  it("shows the byte alone when no node matches or the match has no name", () => {
    expect(relayNodeLabel(0x5a, [], undefined)).toBe("0x5A");
    expect(
      relayNodeLabel(0x5a, [node(0xaaaa_aa5a, { name: "  " })], undefined),
    ).toBe("0x5A");
    expect(relayNodeLabel(0x5a, [node(0xaaaa_aa5a)], undefined)).toBe("0x5A");
  });

  it("shows nothing when no relay was recorded", () => {
    expect(
      relayNodeLabel(0, [node(0xaaaa_aa00, { name: "Zero" })], undefined),
    ).toBeUndefined();
    expect(relayNodeLabel(undefined, [], undefined)).toBeUndefined();
  });

  it("shows the byte alone when it matches only our own node", () => {
    expect(relayNodeLabel(0x5a, [node(ME, { name: "Me" })], ME)).toBe("0x5A");
  });
});

describe("packetRelayNode", () => {
  it("keeps the byte of a relayed packet", () => {
    expect(packetRelayNode({ relayNode: 0x5a, hopsAway: 2 })).toBe(0x5a);
  });

  it("names no relay for a packet heard direct, whose byte is the sender's", () => {
    expect(packetRelayNode({ relayNode: 0x5a, hopsAway: 0 })).toBeUndefined();
  });

  it("keeps the byte when hops are unknown (an implicit ack)", () => {
    expect(packetRelayNode({ relayNode: 0x5a })).toBe(0x5a);
  });

  it("names no relay for a packet from MQTT, unless a LoRa hop delivered it", () => {
    expect(
      packetRelayNode({ relayNode: 0x5a, hopsAway: 2, viaMqtt: true }),
    ).toBeUndefined();
    expect(
      packetRelayNode({
        relayNode: 0x5a,
        hopsAway: 2,
        viaMqtt: true,
        transport: Transport.TRANSPORT_MQTT,
      }),
    ).toBeUndefined();
    expect(
      packetRelayNode({
        relayNode: 0x5a,
        hopsAway: 2,
        viaMqtt: true,
        transport: Transport.TRANSPORT_LORA,
      }),
    ).toBe(0x5a);
  });

  it("names no relay for 0", () => {
    expect(packetRelayNode({ relayNode: 0, hopsAway: 2 })).toBeUndefined();
  });
});

describe("shownRelayNode", () => {
  it("filters a received message's byte, not an outgoing one's", () => {
    const direct = { relayNode: 0x5a, hopsAway: 0 };
    expect(shownRelayNode(direct, false)).toBeUndefined();
    // An outgoing message's byte came from its ack, filtered on arrival.
    expect(shownRelayNode(direct, true)).toBe(0x5a);
    expect(shownRelayNode({ relayNode: 0 }, true)).toBeUndefined();
  });
});
