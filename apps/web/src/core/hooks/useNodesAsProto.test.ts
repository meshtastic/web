import type { Node as SdkNode } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import { toNodeInfo } from "./useNodesAsProto.ts";

const baseNode: SdkNode = {
  num: 0x1234,
  isFavorite: false,
  isIgnored: false,
};

describe("toNodeInfo", () => {
  it("carries the 2.8 trust fields onto the proto NodeInfo", () => {
    const info = toNodeInfo({
      ...baseNode,
      isMuted: true,
      hasXeddsaSigned: true,
      heardOnCurrentLora: false,
    });
    expect(info.isMuted).toBe(true);
    expect(info.hasXeddsaSigned).toBe(true);
    expect(info.heardOnCurrentLora).toBe(false);
  });

  it("treats a node with no heardOnCurrentLora answer as heard", () => {
    // proto3 bools default to false, which would wrongly read as "unheard".
    const info = toNodeInfo(baseNode);
    expect(info.heardOnCurrentLora).toBe(true);
    expect(info.isMuted).toBe(false);
    expect(info.hasXeddsaSigned).toBe(false);
  });

  it("carries the status message when the node has one", () => {
    expect(toNodeInfo({ ...baseNode, status: "On the trail" }).status).toBe(
      "On the trail",
    );
    expect(toNodeInfo(baseNode).status).toBeUndefined();
  });
});
