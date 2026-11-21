import { describe, expect, it } from "vitest";
import { buildInfo } from "./buildInfo.ts";

describe("buildInfo", () => {
  it("keeps the version and shortens the commit to seven characters", () => {
    expect(buildInfo("v2.7.2", "B75F0F41A9C3")).toEqual({
      version: "v2.7.2",
      commit: "b75f0f41a9c3",
      shortCommit: "b75f0f4",
    });
  });

  it.each([undefined, "", "  ", "undefined", "unk", 42])(
    "treats %s as not available",
    (raw) => {
      expect(buildInfo(raw, raw)).toEqual({
        version: undefined,
        commit: undefined,
        shortCommit: undefined,
      });
    },
  );
});
