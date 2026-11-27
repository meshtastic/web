import { describe, expect, it } from "vitest";
import { base64Encode } from "@bufbuild/protobuf/wire";
import {
  adminKeyCandidates,
  adminKeySlots,
  MASKED_KEY,
} from "./securityKeys.ts";

describe("adminKeySlots", () => {
  it("has no keys and the first slot free when empty", () => {
    expect(adminKeySlots(["", "", ""])).toEqual({ filled: [], nextEmpty: 0 });
  });

  it("lists filled slots and the first gap", () => {
    expect(adminKeySlots(["a", "", "c"])).toEqual({
      filled: [
        { index: 0, value: "a" },
        { index: 2, value: "c" },
      ],
      nextEmpty: 1,
    });
  });

  it("has no free slot when all three hold keys", () => {
    expect(adminKeySlots(["a", "b", "c"]).nextEmpty).toBeUndefined();
  });

  it("treats missing and blank entries as empty", () => {
    expect(adminKeySlots(["  "]).nextEmpty).toBe(0);
    expect(adminKeySlots([]).filled).toEqual([]);
  });
});

describe("MASKED_KEY", () => {
  it("does not depend on the key", () => {
    expect(MASKED_KEY).toMatch(/^•+$/);
  });
});

describe("adminKeyCandidates", () => {
  const key = (fill: number) => new Uint8Array(32).fill(fill);
  const fallbackName = (last4: string) => `Meshtastic ${last4}`;

  it("keeps other radios with a key, sorted by name", () => {
    const result = adminKeyCandidates(
      [
        { num: 1, user: { longName: "Me", publicKey: key(1) } },
        { num: 2, user: { longName: "Zulu", publicKey: key(2) } },
        { num: 3, user: { longName: "Alpha", publicKey: key(3) } },
        { num: 4, user: { longName: "Keyless", publicKey: new Uint8Array() } },
        { num: 5, user: { longName: "Taken", publicKey: key(5) } },
      ],
      { myNodeNum: 1, takenKeys: [base64Encode(key(5)), ""], fallbackName },
    );
    expect(result.map((c) => c.name)).toEqual(["Alpha", "Zulu"]);
    expect(result[0]?.key).toBe(base64Encode(key(3)));
  });

  it("names a radio without a name by its id and reports verification", () => {
    const [candidate] = adminKeyCandidates(
      [
        {
          num: 0xabcd1234,
          user: { publicKey: key(9) },
          isKeyManuallyVerified: true,
        },
      ],
      { takenKeys: [], fallbackName },
    );
    expect(candidate?.name).toBe("Meshtastic 1234");
    expect(candidate?.verified).toBe(true);
  });
});
