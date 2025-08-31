import { useFilterNode } from "@components/generic/Filter/useFilterNode.ts";
import { Protobuf } from "@meshtastic/core";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

function createMockNode(): Protobuf.Mesh.NodeInfo {
  return {
    $typeName: "meshtastic.NodeInfo",
    num: 1234567890,
    snr: -10.2,
    lastHeard: 1747519674,
    channel: 0,
    viaMqtt: false,
    isFavorite: true,
    isIgnored: false,
    hopsAway: 2,
    isKeyManuallyVerified: false,
    user: {
      $typeName: "meshtastic.User",
      id: "!12345678",
      longName: "longName",
      shortName: "lN",
      macaddr: new Uint8Array(0),
      hwModel: Protobuf.Mesh.HardwareModel.TLORA_T3_S3,
      isLicensed: false,
      role: Protobuf.Config.Config_DeviceConfig_Role.CLIENT,
      publicKey: new Uint8Array(32),
    },
    deviceMetrics: {
      $typeName: "meshtastic.DeviceMetrics",
      batteryLevel: 101,
      voltage: 4.21,
      channelUtilization: 7.5,
      airUtilTx: 2.57,
      uptimeSeconds: 528092,
    },
  };
}

describe("useFilterNode", () => {
  const { result } = renderHook(() => useFilterNode());
  const { nodeFilter, defaultFilterValues, isFilterDirty } = result.current;

  describe("nodeFilter", () => {
    const node = createMockNode();

    it("filters by nodeName", () => {
      expect(nodeFilter(node, { nodeName: "lon" })).toBe(true);
      expect(nodeFilter(node, { nodeName: "xxx" })).toBe(false);
    });

    it("filters by hopsAway", () => {
      expect(nodeFilter(node, { hopsAway: [0, 1] })).toBe(false);
      expect(nodeFilter(node, { hopsAway: [2, 2] })).toBe(true);
    });

    it("filters by snr", () => {
      expect(nodeFilter(node, { snr: [-12, -10] })).toBe(true);
      expect(nodeFilter(node, { snr: [-17, -16] })).toBe(false);
    });

    it("filters by batteryLevel", () => {
      expect(nodeFilter(node, { batteryLevel: [0, 100] })).toBe(false);
      expect(nodeFilter(node, { batteryLevel: [100, 101] })).toBe(true);
    });

    it("filters by isFavorite", () => {
      expect(nodeFilter(node, { isFavorite: true })).toBe(true);
      expect(nodeFilter(node, { isFavorite: false })).toBe(false);
      expect(nodeFilter(node, { isFavorite: undefined })).toBe(true);
    });

    it("filters by viaMqtt", () => {
      expect(nodeFilter(node, { viaMqtt: true })).toBe(false);
      expect(nodeFilter(node, { viaMqtt: false })).toBe(true);
      expect(nodeFilter(node, { viaMqtt: undefined })).toBe(true);
    });

    it("filters by airUtilTx", () => {
      expect(nodeFilter(node, { airUtilTx: [2, 3] })).toBe(true);
      expect(nodeFilter(node, { airUtilTx: [3, 4] })).toBe(false);
    });

    it("filters by channelUtilization", () => {
      expect(nodeFilter(node, { channelUtilization: [7, 8] })).toBe(true);
      expect(nodeFilter(node, { channelUtilization: [8, 9] })).toBe(false);
    });

    it("filters by voltage", () => {
      expect(nodeFilter(node, { voltage: [4, 4.3] })).toBe(true);
      expect(nodeFilter(node, { voltage: [4.3, 5] })).toBe(false);
    });

    it("filters by role", () => {
      expect(
        nodeFilter(node, {
          role: [Protobuf.Config.Config_DeviceConfig_Role.CLIENT],
        }),
      ).toBe(true);
      expect(
        nodeFilter(node, {
          role: [Protobuf.Config.Config_DeviceConfig_Role.REPEATER],
        }),
      ).toBe(false);
    });

    it("filters by hwModel", () => {
      expect(
        nodeFilter(node, {
          hwModel: [Protobuf.Mesh.HardwareModel.TLORA_T3_S3],
        }),
      ).toBe(true);
      expect(
        nodeFilter(node, { hwModel: [Protobuf.Mesh.HardwareModel.HELTEC_V3] }),
      ).toBe(false);
    });

    it("filters by hopsUnknown", () => {
      expect(nodeFilter(node, { hopsUnknown: true })).toBe(false);
      expect(nodeFilter(node, { hopsUnknown: false })).toBe(true);
      expect(nodeFilter(node, { hopsUnknown: undefined })).toBe(true);
    });

    it("filters by showUnheard", () => {
      expect(nodeFilter(node, { showUnheard: true })).toBe(false);
      expect(nodeFilter(node, { showUnheard: false })).toBe(true);
      expect(nodeFilter(node, { showUnheard: undefined })).toBe(true);
    });

    it("returns false when current matches defaults", () => {
      expect(isFilterDirty(defaultFilterValues)).toBe(false);
    });

    it("detects dirty string field", () => {
      const modified = { ...defaultFilterValues, nodeName: "abc" };
      expect(isFilterDirty(modified)).toBe(true);
    });

    it("detects dirty numeric tuple field", () => {
      const modified = {
        ...defaultFilterValues,
        snr: [-10, 5] as [number, number],
      };
      expect(isFilterDirty(modified)).toBe(true);
    });

    it("detects dirty boolean field (isFavorite)", () => {
      const modified = { ...defaultFilterValues, isFavorite: true };
      expect(isFilterDirty(modified)).toBe(true);
    });

    it("detects dirty boolean field (viaMqtt)", () => {
      const modified = { ...defaultFilterValues, viaMqtt: true };
      expect(isFilterDirty(modified)).toBe(true);
    });

    it("detects dirty enum array field (role)", () => {
      const modified = {
        ...defaultFilterValues,
        role: [Protobuf.Config.Config_DeviceConfig_Role.REPEATER],
      };
      expect(isFilterDirty(modified)).toBe(true);
    });

    it("detects dirty enum array field (hwModel)", () => {
      const modified = {
        ...defaultFilterValues,
        hwModel: [Protobuf.Mesh.HardwareModel.HELTEC_V3],
      };
      expect(isFilterDirty(modified)).toBe(true);
    });

    it("detects dirty boolean field (hopsUnknown)", () => {
      const modified = { ...defaultFilterValues, hopsUnknown: true };
      expect(isFilterDirty(modified)).toBe(true);
    });

    it("detects dirty boolean field (showUnheard)", () => {
      const modified = { ...defaultFilterValues, showUnheard: true };
      expect(isFilterDirty(modified)).toBe(true);
    });
  });

  describe("default-boundary semantics", () => {
    const node = createMockNode();

    it("lastHeard: end at default max means 'any age'", () => {
      const {
        lastHeard: [lastHeardMin, lastHeardMax],
      } = defaultFilterValues;
      const veryOld = { ...node, lastHeard: lastHeardMax + 1 }; // older than slider max
      expect(
        nodeFilter(veryOld, { lastHeard: [lastHeardMin, lastHeardMax] }),
      ).toBe(true); // open upper
      expect(
        nodeFilter(veryOld, { lastHeard: [lastHeardMin, lastHeardMax - 1] }),
      ).toBe(false); // now bounded
    });

    it("snr: max at default means no upper bound", () => {
      const {
        snr: [snrMin, snrMax],
      } = defaultFilterValues;
      const hiSnr = { ...node, snr: snrMax + 1 }; // above slider max
      expect(nodeFilter(hiSnr, { snr: [snrMin, snrMax] })).toBe(true); // open upper
      expect(nodeFilter(hiSnr, { snr: [snrMin, snrMax - 1] })).toBe(false); // bounded
    });

    it("snr: min at default means no lower bound", () => {
      const {
        snr: [snrMin, snrMax],
      } = defaultFilterValues;
      const loSnr = { ...node, snr: snrMin - 1 }; // below slider min
      expect(nodeFilter(loSnr, { snr: [snrMin, snrMax] })).toBe(true); // open lower
      expect(nodeFilter(loSnr, { snr: [snrMin + 1, snrMax] })).toBe(false); // bounded
    });

    it("voltage: max at default means no upper bound", () => {
      const {
        voltage: [voltageMin, voltageMax],
      } = defaultFilterValues;
      const hiV = {
        ...node,
        deviceMetrics: {
          ...node.deviceMetrics!,
          voltage: voltageMax + 1,
        },
      } satisfies Protobuf.Mesh.NodeInfo;
      expect(nodeFilter(hiV, { voltage: [voltageMin, voltageMax] })).toBe(true); // open upper
      expect(
        nodeFilter(hiV, { voltage: [voltageMin, voltageMax - 0.01] }),
      ).toBe(false); // bounded
    });
  });
});
