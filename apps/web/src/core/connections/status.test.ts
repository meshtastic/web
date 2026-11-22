import type { Connection } from "@app/core/stores/deviceStore/types";
import { describe, expect, it } from "vitest";
import {
  connectionLabel,
  ownRadioName,
  isUnfinishedAttempt,
  mostRecentConnection,
  nextConnectionPatch,
  pruneAtStartup,
  pruneUnfinishedAttempts,
  supersededAttempts,
} from "./status.ts";

type SerialConnection = Extract<Connection, { type: "serial" }>;

const serial = (
  id: number,
  extra: Partial<SerialConnection> = {},
): SerialConnection => ({
  id,
  type: "serial",
  name: "USB radio",
  createdAt: id,
  status: "online",
  usbVendorId: 0x303a,
  usbProductId: 0x1001,
  ...extra,
});

describe("nextConnectionPatch", () => {
  it("stamps lastConnectedAt and ends pending once the handshake finishes", () => {
    expect(nextConnectionPatch("configuring", "configured", 10)).toEqual({
      status: "configured",
      lastConnectedAt: 10,
      pending: undefined,
    });
  });

  it("stamps again when a session that reached the radio ends", () => {
    expect(nextConnectionPatch("configured", "disconnected", 20)).toEqual({
      status: "disconnected",
      lastConnectedAt: 20,
    });
    expect(nextConnectionPatch("configured", "connecting", 21)).toEqual({
      status: "connecting",
      lastConnectedAt: 21,
    });
  });

  it("leaves lastConnectedAt alone for attempts that never reached a radio", () => {
    expect(nextConnectionPatch("connecting", "disconnected", 30)).toEqual({
      status: "disconnected",
    });
    expect(nextConnectionPatch("connecting", "error", 30)).toEqual({
      status: "error",
    });
    expect(nextConnectionPatch(undefined, "connecting", 30)).toEqual({
      status: "connecting",
    });
  });
});

describe("pruneUnfinishedAttempts", () => {
  it("drops pending entries that never reached a radio", () => {
    const kept = pruneUnfinishedAttempts([
      serial(1, { pending: true }),
      serial(2, { lastConnectedAt: 5 }),
      serial(3, { pending: true, nodeNum: 7 }),
      serial(4),
    ]);
    expect(kept.map((c) => c.id)).toEqual([2, 3, 4]);
  });

  it("treats an entry with a node number as having reached a radio", () => {
    expect(isUnfinishedAttempt(serial(1, { pending: true, nodeNum: 1 }))).toBe(
      false,
    );
  });
});

describe("pruneAtStartup", () => {
  it("merges entries that reached the same radio, keeping the latest", () => {
    // What the hardware run left: three entries, one radio (one nodeNum).
    const kept = pruneAtStartup([
      serial(1, { nodeNum: 0x71275a97 }),
      serial(2, { nodeNum: 0x71275a97 }),
      serial(3, { nodeNum: 0x71275a97, lastConnectedAt: 50 }),
    ]);
    expect(kept.map((c) => c.id)).toEqual([3]);
  });

  it("keeps two identical USB radios apart by node number", () => {
    const kept = pruneAtStartup([
      serial(1, { nodeNum: 1, lastConnectedAt: 5 }),
      serial(2, { nodeNum: 2, lastConnectedAt: 6 }),
    ]);
    expect(kept.map((c) => c.id)).toEqual([1, 2]);
  });

  it("keeps the default entry when it duplicates another", () => {
    const kept = pruneAtStartup([
      serial(1, { nodeNum: 7, isDefault: true }),
      serial(2, { nodeNum: 7, lastConnectedAt: 9 }),
    ]);
    expect(kept.map((c) => c.id)).toEqual([1]);
  });

  it.each(["USB serial radio", "Serial radio"])(
    'renames entries still called "%s"',
    (name) => {
      const [conn] = pruneAtStartup([
        serial(1, { name, nodeNum: 1, lastConnectedAt: 1 }),
      ]);
      expect(conn?.name).toBe("USB radio");
    },
  );

  it("drops pending attempts and never-connected duplicates of a reached radio", () => {
    const kept = pruneAtStartup([
      serial(1),
      serial(2, { pending: true }),
      serial(3, { nodeNum: 42 }),
      serial(4, { usbProductId: 0x1002 }),
    ]);
    expect(kept.map((c) => c.id)).toEqual([3, 4]);
  });

  it("keeps two identical radios that both connected", () => {
    const kept = pruneAtStartup([
      serial(1, { nodeNum: 1 }),
      serial(2, { lastConnectedAt: 9 }),
    ]);
    expect(kept.map((c) => c.id)).toEqual([1, 2]);
  });
});

describe("supersededAttempts", () => {
  it("includes other idle entries for the same radio once it connects", () => {
    const reached = serial(3, { nodeNum: 9, status: "configured" });
    expect(
      supersededAttempts(
        [
          serial(1, { nodeNum: 9, lastConnectedAt: 1 }),
          serial(2, { nodeNum: 8, lastConnectedAt: 1 }),
          reached,
        ],
        reached,
      ),
    ).toEqual([1]);
  });

  it("returns never-connected entries for the same USB ids", () => {
    const reached = serial(3, { status: "configured", lastConnectedAt: 9 });
    const ids = supersededAttempts(
      [serial(1), serial(2, { pending: true }), reached],
      reached,
    );
    expect(ids).toEqual([1, 2]);
  });

  it("keeps an entry that ever connected, which may be an identical radio", () => {
    const reached = serial(3, { status: "configured" });
    expect(
      supersededAttempts([serial(1, { nodeNum: 4 }), reached], reached),
    ).toEqual([]);
    expect(
      supersededAttempts([serial(1, { lastConnectedAt: 4 }), reached], reached),
    ).toEqual([]);
  });

  it("keeps entries for other ids, other transports, in use or default", () => {
    const reached = serial(3, { status: "configured" });
    const others: Connection[] = [
      serial(1, { usbProductId: 0x1002 }),
      serial(2, { status: "connecting" }),
      serial(4, { isDefault: true }),
      {
        id: 5,
        type: "bluetooth",
        name: "BLE",
        createdAt: 5,
        status: "online",
      },
      serial(6, { usbVendorId: undefined, usbProductId: undefined }),
    ];
    expect(supersededAttempts([...others, reached], reached)).toEqual([]);
  });

  it("matches HTTP entries by URL and bluetooth entries by device id", () => {
    const http = (id: number, url: string): Connection => ({
      id,
      type: "http",
      name: url,
      url,
      createdAt: id,
      status: "error",
    });
    const reachedHttp = http(2, "http://10.0.0.2");
    expect(
      supersededAttempts(
        [http(1, "http://10.0.0.2"), http(3, "http://10.0.0.3"), reachedHttp],
        reachedHttp,
      ),
    ).toEqual([1]);

    const ble = (id: number, deviceId?: string): Connection => ({
      id,
      type: "bluetooth",
      name: "BLE",
      deviceId,
      createdAt: id,
      status: "online",
    });
    const reachedBle = ble(2, "abc");
    expect(
      supersededAttempts(
        [ble(1, "abc"), ble(3, "xyz"), ble(4), reachedBle],
        reachedBle,
      ),
    ).toEqual([1]);
  });
});

describe("mostRecentConnection", () => {
  it("picks the radio reached most recently, skipping never-connected ones", () => {
    const picked = mostRecentConnection([
      serial(1, { lastConnectedAt: 100 }),
      serial(2, { lastConnectedAt: 300 }),
      serial(3, { createdAt: 900 }),
    ]);
    expect(picked?.id).toBe(2);
  });

  it("falls back to createdAt for radios reached before lastConnectedAt was kept", () => {
    const picked = mostRecentConnection([
      serial(1, { nodeNum: 1, createdAt: 10 }),
      serial(2, { nodeNum: 2, createdAt: 20 }),
    ]);
    expect(picked?.id).toBe(2);
  });

  it("returns nothing when no saved connection reached a radio", () => {
    expect(mostRecentConnection([serial(1)])).toBeUndefined();
  });
});

describe("connectionLabel", () => {
  it("names the radio once its name is known", () => {
    expect(connectionLabel({ name: "USB radio", radioName: "EAO1 Base" })).toBe(
      "EAO1 Base",
    );
  });

  it.each([undefined, "", "  "])(
    "falls back to the connection name when the radio name is %j",
    (radioName) => {
      expect(
        connectionLabel({
          name: "USB radio",
          ...(radioName === undefined ? {} : { radioName }),
        }),
      ).toBe("USB radio");
    },
  );
});

describe("ownRadioName", () => {
  it("prefers the long name, then the short name", () => {
    expect(
      ownRadioName(
        [{ num: 7, user: { longName: "EAO1 Base", shortName: "EAO1" } }],
        7,
      ),
    ).toBe("EAO1 Base");
    expect(ownRadioName([{ num: 7, user: { shortName: "EAO1" } }], 7)).toBe(
      "EAO1",
    );
  });

  it("is undefined until the radio has described itself", () => {
    expect(ownRadioName([{ num: 8, user: { longName: "Other" } }], 7)).toBe(
      undefined,
    );
    expect(ownRadioName([{ num: 7 }], 7)).toBe(undefined);
    expect(ownRadioName([{ num: 7, user: { longName: " " } }], 7)).toBe(
      undefined,
    );
  });
});
