import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it } from "vitest";
import { MeshClient } from "../../core/client/MeshClient.ts";
import { createFakeTransport } from "../../core/testing/createFakeTransport.ts";
import { ChannelNumber } from "../../core/types.ts";

const KEY_A = new Uint8Array([1, 2, 3, 4]);
const KEY_B = new Uint8Array([9, 8, 7, 6]);

function nodeInfo(num: number, key?: Uint8Array, longName = `Node ${num}`) {
  return create(Protobuf.Mesh.NodeInfoSchema, {
    num,
    user: create(Protobuf.Mesh.UserSchema, {
      id: `!${num.toString(16)}`,
      longName,
      shortName: longName.slice(0, 4),
      publicKey: key ?? new Uint8Array(),
    }),
  });
}

describe("NodesClient PKI error tracking", () => {
  it("MISMATCH_PKI when an existing node re-presents with a different key", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });

    client.events.onNodeInfoPacket.dispatch(nodeInfo(1, KEY_A, "First"));
    expect(client.nodes.errorFor(1)).toBeUndefined();

    client.events.onNodeInfoPacket.dispatch(nodeInfo(1, KEY_B, "Impostor"));
    expect(client.nodes.errorFor(1)?.error).toBe("MISMATCH_PKI");
    // Original node is preserved.
    expect(client.nodes.byNum(1)?.user?.longName).toBe("First");
  });

  it("DUPLICATE_PKI when a new node claims another node's public key", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });

    client.events.onNodeInfoPacket.dispatch(nodeInfo(1, KEY_A));
    client.events.onNodeInfoPacket.dispatch(nodeInfo(2, KEY_A));

    expect(client.nodes.errorFor(2)?.error).toBe("DUPLICATE_PKI");
    // The duplicate is rejected — only the first node remains.
    expect(client.nodes.list.value.map((n) => n.num)).toEqual([1]);
  });

  it("clears the error on a subsequent successful update", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });

    // Seed with empty key so any incoming key is allowed.
    client.events.onNodeInfoPacket.dispatch(nodeInfo(1));
    client.events.onNodeInfoPacket.dispatch(nodeInfo(1, KEY_A));
    // Trigger a routing-error error.
    client.nodes.setError(1, Protobuf.Mesh.Routing_Error.PKI_UNKNOWN_PUBKEY);
    expect(client.nodes.hasError(1)).toBe(true);

    // A clean refresh with the same key should clear the error.
    client.events.onNodeInfoPacket.dispatch(nodeInfo(1, KEY_A));
    expect(client.nodes.hasError(1)).toBe(false);
  });

  it("records routing PKI errors against the originating node", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });

    client.events.onRoutingPacket.dispatch({
      id: 1,
      from: 99,
      to: 0xffffffff,
      channel: ChannelNumber.Primary,
      type: "broadcast",
      rxTime: new Date(),
      data: create(Protobuf.Mesh.RoutingSchema, {
        variant: {
          case: "errorReason",
          value: Protobuf.Mesh.Routing_Error.PKI_UNKNOWN_PUBKEY,
        },
      }),
    });

    expect(client.nodes.errorFor(99)?.error).toBe(Protobuf.Mesh.Routing_Error.PKI_UNKNOWN_PUBKEY);
  });

  it("clearError / clearAllErrors", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });

    client.nodes.setError(1, "MISMATCH_PKI");
    client.nodes.setError(2, "DUPLICATE_PKI");
    expect(client.nodes.errors.value.length).toBe(2);

    client.nodes.clearError(1);
    expect(client.nodes.errors.value.length).toBe(1);

    client.nodes.clearAllErrors();
    expect(client.nodes.errors.value.length).toBe(0);
  });
});
