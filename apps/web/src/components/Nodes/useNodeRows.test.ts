import { makeNode } from "@core/nodes/testNodes.ts";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNodeRows } from "./useNodeRows.ts";

const env = vi.hoisted(() => ({
  device: {
    config: { security: { publicKey: new Uint8Array([1, 2, 3]) } },
    adminAccessNodes: [0x0c40] as number[],
    adminAccessKey: "AQID" as string | undefined,
  },
}));

const nodes = [makeNode({ num: 9, longName: "Me" }), makeNode({ num: 0x0c40 })];

vi.mock("@core/hooks/useNodesAsProto.ts", () => ({
  useNodesAsProto: () => nodes,
  useMyNodeAsProto: () => nodes[0],
}));

vi.mock("@core/stores", () => ({
  useDevice: () => env.device,
}));

const badged = (rows: ReturnType<typeof useNodeRows>["rows"]) =>
  rows.filter((row) => row.hasAdminAccess).map((row) => row.num);

describe("useNodeRows admin access", () => {
  beforeEach(() => {
    env.device = {
      config: { security: { publicKey: new Uint8Array([1, 2, 3]) } },
      adminAccessNodes: [0x0c40],
      adminAccessKey: "AQID",
    };
  });

  it("badges nodes remembered under this radio's key", () => {
    const { result } = renderHook(() => useNodeRows());
    expect(badged(result.current.rows)).toEqual([0x0c40]);
  });

  it("drops the badge once the radio's key changes", () => {
    const { result, rerender } = renderHook(() => useNodeRows());
    expect(badged(result.current.rows)).toEqual([0x0c40]);

    env.device = {
      ...env.device,
      config: { security: { publicKey: new Uint8Array([4, 5, 6]) } },
    };
    rerender();
    expect(badged(result.current.rows)).toEqual([]);
  });

  it("shows no badge for a list saved without a key", () => {
    env.device = { ...env.device, adminAccessKey: undefined };
    const { result } = renderHook(() => useNodeRows());
    expect(badged(result.current.rows)).toEqual([]);
  });
});
