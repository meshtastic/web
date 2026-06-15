import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it } from "vitest";
import { NodeMapper } from "./NodeMapper.ts";

describe("NodeMapper", () => {
  it("projects NodeInfo onto the Node domain shape", () => {
    const proto = create(Protobuf.Mesh.NodeInfoSchema, {
      num: 0xdeadbeef,
      lastHeard: 1700000000,
      snr: 7,
      isFavorite: true,
      isIgnored: false,
    });
    const node = NodeMapper.fromProto(proto);
    expect(node.num).toBe(0xdeadbeef);
    expect(node.lastHeard).toBe(1700000000);
    expect(node.snr).toBe(7);
    expect(node.isFavorite).toBe(true);
    expect(node.isIgnored).toBe(false);
    expect(node.user).toBeUndefined();
  });
});
