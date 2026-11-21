import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { describe, expect, it } from "vitest";
import {
  batteryInfo,
  formatMacAddress,
  hopsDisplay,
  isHeardWithin,
  knownNodeCount,
  ONLINE_WINDOW_MS,
  summarizeNodes,
  toNodeRow,
} from "./nodeRow.ts";
import { makeNode, makeRow, NOW, testContext } from "./testNodes.ts";

describe("toNodeRow", () => {
  it("names, ids and initials come from the user info", () => {
    const row = makeRow({
      num: 0x71275a97,
      longName: "IB North",
      shortName: "IB-N",
    });
    expect(row.name).toBe("IB North");
    expect(row.shortName).toBe("IB-N");
    expect(row.initials).toBe("IB-N");
    expect(row.id).toBe("!71275a97");
  });

  it("falls back to the localised name without user info", () => {
    const row = makeRow({ num: 0x71275a97 });
    expect(row.name).toBe("Meshtastic 5A97");
    expect(row.shortName).toBeUndefined();
    expect(row.role).toBeUndefined();
    expect(row.hardware).toBeUndefined();
  });

  it("labels role and hardware from the enums, hiding UNSET hardware", () => {
    const row = makeRow({
      num: 1,
      longName: "a",
      role: Protobuf.Config.Config_DeviceConfig_Role.CLIENT_MUTE,
      hwModel: Protobuf.Mesh.HardwareModel.HELTEC_V3,
    });
    expect(row.role).toBe("CLIENT MUTE");
    expect(row.hardware).toBe("HELTEC V3");
    expect(makeRow({ num: 1, longName: "a" }).hardware).toBeUndefined();
  });

  it("treats a node never heard as having no SNR or last-heard time", () => {
    const row = makeRow({ num: 1, snr: 0 });
    expect(row.lastHeardMs).toBeUndefined();
    expect(row.snr).toBeUndefined();
    expect(row.snrQuality).toBeUndefined();
    expect(row.isOnline).toBe(false);
  });

  it("reports SNR and rates it against the LoRa preset", () => {
    const row = makeRow({ num: 1, heardSecondsAgo: 60, snr: -9 });
    expect(row.snr).toBe(-9);
    // LongFast floor is -17.5 dB, so -9 dB is good.
    expect(row.snrQuality).toBe("good");
    expect(row.lastHeardMs).toBe(NOW - 60_000);
    expect(row.isOnline).toBe(true);
  });

  it("is offline once last heard falls outside the online window", () => {
    const seconds = ONLINE_WINDOW_MS / 1000 + 1;
    expect(makeRow({ num: 1, heardSecondsAgo: seconds }).isOnline).toBe(false);
  });

  it("is direct only at zero hops over LoRa", () => {
    expect(makeRow({ num: 1, hopsAway: 0 }).isDirect).toBe(true);
    expect(makeRow({ num: 1, hopsAway: 0, viaMqtt: true }).isDirect).toBe(
      false,
    );
    expect(makeRow({ num: 1, hopsAway: 2 }).isDirect).toBe(false);
    expect(makeRow({ num: 1 }).hops).toBeUndefined();
  });

  it("measures distance from this device, not for the device itself", () => {
    const me = makeNode({ num: 9, lat: 1, lng: 1 });
    const ctx = { myNodeNum: 9, myPosition: me.position };
    const row = makeRow({ num: 1, lat: 1.01, lng: 1 }, ctx);
    expect(row.distanceMeters ?? 0).toBeGreaterThan(1100);
    expect(row.distanceMeters ?? 0).toBeLessThan(1120);
    expect(makeRow({ num: 9, lat: 1, lng: 1 }, ctx).distanceMeters).toBe(
      undefined,
    );
    expect(makeRow({ num: 2 }, ctx).distanceMeters).toBeUndefined();
    expect(makeRow({ num: 1, lat: 1.01, lng: 1 }).distanceMeters).toBe(
      undefined,
    );
  });

  it("keeps a position only when it is real", () => {
    expect(makeRow({ num: 1, lat: 37.5, lng: -122.25 }).lngLat).toEqual([
      -122.25, 37.5,
    ]);
    expect(makeRow({ num: 1, lat: 0, lng: 0 }).lngLat).toBeUndefined();
  });

  it("marks this device and non-messageable nodes", () => {
    const ctx = { myNodeNum: 5 };
    expect(makeRow({ num: 5, longName: "me" }, ctx).isSelf).toBe(true);
    expect(makeRow({ num: 5, longName: "me" }, ctx).isMessageable).toBe(false);
    expect(
      makeRow({ num: 6, longName: "x", isUnmessagable: true }, ctx)
        .isMessageable,
    ).toBe(false);
    expect(makeRow({ num: 6, longName: "x" }, ctx).isMessageable).toBe(true);
  });

  it("carries battery, voltage, key and status", () => {
    const row = makeRow({
      num: 1,
      longName: "a",
      batteryLevel: 87,
      voltage: -3.9,
      publicKey: new Uint8Array([1, 2]),
      status: "  at camp  ",
      heardOnCurrentLora: false,
    });
    expect(row.battery).toEqual({ kind: "level", percent: 87 });
    expect(row.voltage).toBeCloseTo(3.9);
    expect(row.publicKey).toEqual(new Uint8Array([1, 2]));
    expect(row.status).toBe("at camp");
    expect(row.unheardOnCurrentLora).toBe(true);
    expect(makeRow({ num: 1, longName: "a" }).publicKey).toBeUndefined();
    expect(
      makeRow({ num: 1, heardOnCurrentLora: false, viaMqtt: true })
        .unheardOnCurrentLora,
    ).toBe(false);
  });

  it("formats the MAC address from user info", () => {
    const node = makeNode({ num: 1, longName: "a" });
    const withMac = {
      ...node,
      user: create(Protobuf.Mesh.UserSchema, {
        longName: "a",
        macaddr: new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x00, 0x01]),
      }),
    };
    expect(toNodeRow(withMac, testContext()).macAddress).toBe(
      "de:ad:be:ef:00:01",
    );
  });
});

describe("batteryInfo", () => {
  it("maps 101 and above to plugged in and hides unknown levels", () => {
    expect(batteryInfo(101)).toEqual({ kind: "pluggedIn" });
    expect(batteryInfo(55.4)).toEqual({ kind: "level", percent: 55 });
    expect(batteryInfo(0)).toBeUndefined();
    expect(batteryInfo(undefined)).toBeUndefined();
  });
});

describe("formatMacAddress", () => {
  it("ignores empty and all-zero addresses", () => {
    expect(formatMacAddress(undefined)).toBeUndefined();
    expect(formatMacAddress(new Uint8Array())).toBeUndefined();
    expect(formatMacAddress(new Uint8Array(6))).toBeUndefined();
    expect(formatMacAddress(new Uint8Array([1, 0xab]))).toBe("01:ab");
  });
});

describe("isHeardWithin", () => {
  it("is inclusive of the window and true for future skew", () => {
    expect(isHeardWithin(NOW - 1000, NOW, 1000)).toBe(true);
    expect(isHeardWithin(NOW - 1001, NOW, 1000)).toBe(false);
    expect(isHeardWithin(NOW + 5000, NOW, 1000)).toBe(true);
    expect(isHeardWithin(undefined, NOW, 1000)).toBe(false);
  });
});

describe("summarizeNodes", () => {
  it("counts known and recently heard nodes, excluding this device", () => {
    const ctx = { myNodeNum: 1 };
    const rows = [
      makeRow({ num: 1, heardSecondsAgo: 1 }, ctx),
      makeRow({ num: 2, heardSecondsAgo: 60 }, ctx),
      makeRow({ num: 3, heardSecondsAgo: 3 * 3600 }, ctx),
      makeRow({ num: 4 }, ctx),
    ];
    expect(summarizeNodes(rows)).toEqual({ known: 3, heardRecently: 1 });
  });
});

describe("toNodeRow altitude", () => {
  it("keeps an altitude of 0 m and leaves a missing one undefined", () => {
    const sea = makeNode({ num: 1, lat: 1, lng: 1, altitude: 0 });
    expect(toNodeRow(sea, testContext()).altitude).toBe(0);
    const none = makeNode({ num: 2, lat: 1, lng: 1 });
    expect(toNodeRow(none, testContext()).altitude).toBeUndefined();
  });
});

describe("the connected radio's own row", () => {
  const own = makeRow(
    {
      num: 5,
      longName: "me",
      heardSecondsAgo: 30,
      snr: 0,
      hopsAway: 0,
    },
    { myNodeNum: 5 },
  );

  it("has no SNR or hop count of its own", () => {
    expect(own.snr).toBeUndefined();
    expect(own.snrQuality).toBeUndefined();
    expect(own.hops).toBeUndefined();
    expect(own.isDirect).toBe(false);
  });

  it("shows as this radio rather than direct or unknown", () => {
    expect(hopsDisplay(own)).toEqual({ kind: "self" });
    expect(
      hopsDisplay(makeRow({ num: 5, heardSecondsAgo: 30 }, { myNodeNum: 5 })),
    ).toEqual({ kind: "self" });
  });
});

describe("hopsDisplay", () => {
  it("describes heard nodes by hop count", () => {
    expect(hopsDisplay(makeRow({ num: 1, hopsAway: 0 }))).toEqual({
      kind: "direct",
      viaMqtt: false,
    });
    expect(hopsDisplay(makeRow({ num: 1, hopsAway: 2 }))).toEqual({
      kind: "hops",
      count: 2,
      viaMqtt: false,
    });
    expect(
      hopsDisplay(makeRow({ num: 1, hopsAway: 0, viaMqtt: true })),
    ).toEqual({ kind: "hops", count: 0, viaMqtt: true });
    expect(hopsDisplay(makeRow({ num: 1 }))).toEqual({
      kind: "unknown",
      viaMqtt: false,
    });
  });
});

describe("knownNodeCount", () => {
  it("counts every node but the connected radio", () => {
    const ctx = { myNodeNum: 1 };
    const rows = [1, 2, 3].map((num) => makeRow({ num }, ctx));
    expect(knownNodeCount(rows)).toBe(2);
  });

  it("counts every node when the radio isn't among them yet", () => {
    const rows = [2, 3].map((num) => makeRow({ num }, { myNodeNum: 1 }));
    expect(knownNodeCount(rows)).toBe(2);
    expect(knownNodeCount([])).toBe(0);
  });
});
