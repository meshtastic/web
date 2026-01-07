import { describe, expect, it } from "vitest";
import {
  ALL_LEAF_KEYS,
  computeLeafHashes,
  computeRootHash,
  createEmptyHashes,
  cyrb53,
  getChangedLeaves,
  groupChangedLeaves,
  hasAnyChanges,
  hashConfig,
  parseLeafKey,
  stableStringify,
} from "./merkleConfig";

describe("cyrb53", () => {
  it("produces consistent results for same input", () => {
    const input = "hello world";
    const hash1 = cyrb53(input);
    const hash2 = cyrb53(input);
    expect(hash1).toBe(hash2);
  });

  it("produces different results for different inputs", () => {
    const hash1 = cyrb53("hello");
    const hash2 = cyrb53("world");
    expect(hash1).not.toBe(hash2);
  });

  it("produces different results with different seeds", () => {
    const input = "hello";
    const hash1 = cyrb53(input, 0);
    const hash2 = cyrb53(input, 1);
    expect(hash1).not.toBe(hash2);
  });

  it("handles empty string", () => {
    const hash = cyrb53("");
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
  });

  it("handles unicode characters", () => {
    const hash = cyrb53("こんにちは世界 🌍");
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
  });
});

describe("stableStringify", () => {
  it("produces deterministic output regardless of key order", () => {
    const obj1 = { b: 2, a: 1, c: 3 };
    const obj2 = { a: 1, c: 3, b: 2 };
    expect(stableStringify(obj1)).toBe(stableStringify(obj2));
  });

  it("handles nested objects with consistent ordering", () => {
    const obj1 = { outer: { b: 2, a: 1 }, z: 1 };
    const obj2 = { z: 1, outer: { a: 1, b: 2 } };
    expect(stableStringify(obj1)).toBe(stableStringify(obj2));
  });

  it("handles arrays", () => {
    const arr = [1, 2, 3];
    expect(stableStringify(arr)).toBe("[1,2,3]");
  });

  it("handles null and undefined", () => {
    expect(stableStringify(null)).toBe("null");
    expect(stableStringify(undefined)).toBe("null");
  });

  it("handles primitives", () => {
    expect(stableStringify(42)).toBe("42");
    expect(stableStringify("hello")).toBe('"hello"');
    expect(stableStringify(true)).toBe("true");
  });

  it("handles Map", () => {
    const map = new Map<string, number>([
      ["b", 2],
      ["a", 1],
    ]);
    const result = stableStringify(map);
    expect(result).toBe('{"a":1,"b":2}');
  });

  it("handles Set", () => {
    const set = new Set([3, 1, 2]);
    const result = stableStringify(set);
    // Set items are stringified and sorted
    expect(result).toBe("[1,2,3]");
  });

  it("handles Date", () => {
    const date = new Date("2025-01-01T00:00:00.000Z");
    const result = stableStringify(date);
    expect(result).toBe('"2025-01-01T00:00:00.000Z"');
  });

  it("handles Uint8Array", () => {
    const arr = new Uint8Array([1, 2, 3]);
    const result = stableStringify(arr);
    expect(result).toBe("[1,2,3]");
  });
});

describe("hashConfig", () => {
  it("produces consistent hash for same config", () => {
    const config = { role: 1, nodeInfoBroadcastSecs: 300 };
    const hash1 = hashConfig(config);
    const hash2 = hashConfig(config);
    expect(hash1).toBe(hash2);
  });

  it("produces different hash for different config", () => {
    const config1 = { role: 1 };
    const config2 = { role: 2 };
    expect(hashConfig(config1)).not.toBe(hashConfig(config2));
  });

  it("handles undefined/null config", () => {
    const hashUndef = hashConfig(undefined);
    const hashNull = hashConfig(null);
    expect(hashUndef).toBe(hashNull);
  });

  it("is order-independent for object keys", () => {
    const config1 = { a: 1, b: 2 };
    const config2 = { b: 2, a: 1 };
    expect(hashConfig(config1)).toBe(hashConfig(config2));
  });
});

describe("computeLeafHashes", () => {
  it("produces correct number of leaves", () => {
    const hashes = computeLeafHashes({});
    expect(hashes.size).toBe(ALL_LEAF_KEYS.length);
    expect(hashes.size).toBe(30); // 8 config + 13 moduleConfig + 8 channels + 1 user
  });

  it("includes all expected keys", () => {
    const hashes = computeLeafHashes({});
    for (const key of ALL_LEAF_KEYS) {
      expect(hashes.has(key)).toBe(true);
    }
  });

  it("produces consistent hashes for same input", () => {
    const input = {
      config: { device: { role: 1 } },
      moduleConfig: { mqtt: { enabled: true } },
    };
    const hashes1 = computeLeafHashes(input);
    const hashes2 = computeLeafHashes(input);

    for (const key of ALL_LEAF_KEYS) {
      expect(hashes1.get(key)).toBe(hashes2.get(key));
    }
  });

  it("detects config changes", () => {
    const base = computeLeafHashes({ config: { device: { role: 1 } } });
    const modified = computeLeafHashes({ config: { device: { role: 2 } } });

    expect(base.get("config:device")).not.toBe(modified.get("config:device"));
    // Other configs should be unchanged
    expect(base.get("config:lora")).toBe(modified.get("config:lora"));
  });

  it("handles channel array", () => {
    const withChannels = computeLeafHashes({
      channels: [
        { index: 0, name: "Primary" },
        { index: 1, name: "Secondary" },
      ],
    });
    const withoutChannels = computeLeafHashes({});

    expect(withChannels.get("channel:0")).not.toBe(
      withoutChannels.get("channel:0"),
    );
    expect(withChannels.get("channel:1")).not.toBe(
      withoutChannels.get("channel:1"),
    );
    // Channels 2-7 should be same (both undefined)
    expect(withChannels.get("channel:2")).toBe(
      withoutChannels.get("channel:2"),
    );
  });

  it("handles user data", () => {
    const withUser = computeLeafHashes({
      user: { shortName: "TEST", longName: "Test User" },
    });
    const withoutUser = computeLeafHashes({});

    expect(withUser.get("user")).not.toBe(withoutUser.get("user"));
  });
});

describe("computeRootHash", () => {
  it("produces consistent hash for same leaves", () => {
    const leaves = computeLeafHashes({ config: { device: { role: 1 } } });
    const root1 = computeRootHash(leaves);
    const root2 = computeRootHash(leaves);
    expect(root1).toBe(root2);
  });

  it("changes when any leaf changes", () => {
    const base = computeLeafHashes({ config: { device: { role: 1 } } });
    const modified = computeLeafHashes({ config: { device: { role: 2 } } });

    const baseRoot = computeRootHash(base);
    const modifiedRoot = computeRootHash(modified);

    expect(baseRoot).not.toBe(modifiedRoot);
  });

  it("changes when channel changes", () => {
    const base = computeLeafHashes({});
    const modified = computeLeafHashes({
      channels: [{ index: 0, name: "Changed" }],
    });

    expect(computeRootHash(base)).not.toBe(computeRootHash(modified));
  });

  it("changes when user changes", () => {
    const base = computeLeafHashes({});
    const modified = computeLeafHashes({
      user: { shortName: "NEW" },
    });

    expect(computeRootHash(base)).not.toBe(computeRootHash(modified));
  });
});

describe("getChangedLeaves", () => {
  it("returns empty array when no changes", () => {
    const hashes = computeLeafHashes({ config: { device: { role: 1 } } });
    const changed = getChangedLeaves(hashes, hashes);
    expect(changed).toEqual([]);
  });

  it("identifies single changed leaf", () => {
    const base = computeLeafHashes({ config: { device: { role: 1 } } });
    const working = computeLeafHashes({ config: { device: { role: 2 } } });

    const changed = getChangedLeaves(base, working);
    expect(changed).toContain("config:device");
    expect(changed.length).toBe(1);
  });

  it("identifies multiple changed leaves", () => {
    const base = computeLeafHashes({});
    const working = computeLeafHashes({
      config: { device: { role: 1 }, lora: { region: 2 } },
      moduleConfig: { mqtt: { enabled: true } },
    });

    const changed = getChangedLeaves(base, working);
    expect(changed).toContain("config:device");
    expect(changed).toContain("config:lora");
    expect(changed).toContain("moduleConfig:mqtt");
  });

  it("identifies channel changes", () => {
    const base = computeLeafHashes({});
    const working = computeLeafHashes({
      channels: [undefined, undefined, { index: 2, name: "Channel 2" }],
    });

    const changed = getChangedLeaves(base, working);
    expect(changed).toContain("channel:2");
  });

  it("identifies user changes", () => {
    const base = computeLeafHashes({});
    const working = computeLeafHashes({
      user: { shortName: "TEST" },
    });

    const changed = getChangedLeaves(base, working);
    expect(changed).toContain("user");
  });
});

describe("hasAnyChanges", () => {
  it("returns false when no changes", () => {
    const hashes = computeLeafHashes({});
    expect(hasAnyChanges(hashes, hashes)).toBe(false);
  });

  it("returns true when changes exist", () => {
    const base = computeLeafHashes({});
    const working = computeLeafHashes({ config: { device: { role: 1 } } });
    expect(hasAnyChanges(base, working)).toBe(true);
  });
});

describe("parseLeafKey", () => {
  it("parses config keys", () => {
    expect(parseLeafKey("config:device")).toEqual({
      type: "config",
      variant: "device",
    });
    expect(parseLeafKey("config:lora")).toEqual({
      type: "config",
      variant: "lora",
    });
  });

  it("parses moduleConfig keys", () => {
    expect(parseLeafKey("moduleConfig:mqtt")).toEqual({
      type: "moduleConfig",
      variant: "mqtt",
    });
  });

  it("parses channel keys", () => {
    expect(parseLeafKey("channel:0")).toEqual({
      type: "channel",
      index: 0,
    });
    expect(parseLeafKey("channel:7")).toEqual({
      type: "channel",
      index: 7,
    });
  });

  it("parses user key", () => {
    expect(parseLeafKey("user")).toEqual({
      type: "user",
    });
  });
});

describe("groupChangedLeaves", () => {
  it("groups changes by type", () => {
    const changed = [
      "config:device",
      "config:lora",
      "moduleConfig:mqtt",
      "channel:0",
      "channel:2",
      "user",
    ] as const;

    const grouped = groupChangedLeaves([...changed]);

    expect(grouped.configChanges).toEqual(["device", "lora"]);
    expect(grouped.moduleConfigChanges).toEqual(["mqtt"]);
    expect(grouped.channelChanges).toEqual([0, 2]);
    expect(grouped.hasUserChange).toBe(true);
  });

  it("handles empty array", () => {
    const grouped = groupChangedLeaves([]);

    expect(grouped.configChanges).toEqual([]);
    expect(grouped.moduleConfigChanges).toEqual([]);
    expect(grouped.channelChanges).toEqual([]);
    expect(grouped.hasUserChange).toBe(false);
  });
});

describe("createEmptyHashes", () => {
  it("creates map with all leaf keys", () => {
    const hashes = createEmptyHashes();
    expect(hashes.size).toBe(ALL_LEAF_KEYS.length);

    for (const key of ALL_LEAF_KEYS) {
      expect(hashes.has(key)).toBe(true);
    }
  });

  it("all values are the same (empty config hash)", () => {
    const hashes = createEmptyHashes();
    const values = Array.from(hashes.values());
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(1);
  });

  it("matches computeLeafHashes with empty input", () => {
    const empty = createEmptyHashes();
    const computed = computeLeafHashes({});

    for (const key of ALL_LEAF_KEYS) {
      expect(empty.get(key)).toBe(computed.get(key));
    }
  });
});
