import { describe, expect, it } from "vitest";
import { diffFields, isDirty, isFieldDirty } from "./diffFields.ts";

interface Lora extends Record<string, unknown> {
  region: string;
  hopLimit: number;
  txEnabled: boolean;
  channels?: number[];
  publicKey?: Uint8Array;
  nested?: { a: number };
}

const saved: Lora = {
  region: "US",
  hopLimit: 3,
  txEnabled: true,
  channels: [0, 1],
  publicKey: new Uint8Array([1, 2, 3]),
  nested: { a: 1 },
};

describe("diffFields", () => {
  it("is empty for identical values", () => {
    expect(diffFields(saved, { ...saved })).toEqual([]);
    expect(isDirty(saved, { ...saved })).toBe(false);
  });

  it("lists changed primitive keys", () => {
    const draft = { ...saved, hopLimit: 4, txEnabled: false };
    expect(diffFields(saved, draft)).toEqual(["hopLimit", "txEnabled"]);
    expect(isDirty(saved, draft)).toBe(true);
  });

  it("compares arrays, nested objects and byte arrays structurally", () => {
    const same = {
      ...saved,
      channels: [0, 1],
      publicKey: new Uint8Array([1, 2, 3]),
      nested: { a: 1 },
    };
    expect(diffFields(saved, same)).toEqual([]);

    const changed = {
      ...saved,
      channels: [0, 2],
      publicKey: new Uint8Array([1, 2, 4]),
      nested: { a: 2 },
    };
    expect(diffFields(saved, changed)).toEqual([
      "channels",
      "publicKey",
      "nested",
    ]);
  });

  it("counts keys added or removed on one side", () => {
    const { channels: _omit, ...withoutChannels } = saved;
    expect(diffFields(saved, withoutChannels)).toEqual(["channels"]);
    expect(diffFields(withoutChannels, saved)).toEqual(["channels"]);
  });

  it("ignores protobuf type tags", () => {
    expect(
      diffFields({ $typeName: "a", x: 1 }, { $typeName: "b", x: 1 }),
    ).toEqual([]);
  });
});

describe("isFieldDirty", () => {
  it("checks one key", () => {
    const draft = { ...saved, region: "EU_868" };
    expect(isFieldDirty(saved, draft, "region")).toBe(true);
    expect(isFieldDirty(saved, draft, "hopLimit")).toBe(false);
  });
});
