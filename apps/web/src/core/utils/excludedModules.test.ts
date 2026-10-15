import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import { isModuleExcluded, MODULE_EXCLUSION_BITS } from "./excludedModules.ts";

const Excluded = Protobuf.Mesh.ExcludedModules;

describe("MODULE_EXCLUSION_BITS", () => {
  it("maps the 2.8.1 modules to their bits", () => {
    expect(MODULE_EXCLUSION_BITS.statusmessage).toBe(0x8000);
    expect(MODULE_EXCLUSION_BITS.trafficManagement).toBe(0x10000);
    expect(MODULE_EXCLUSION_BITS.tak).toBe(0x20000);
    expect(MODULE_EXCLUSION_BITS.meshBeacon).toBe(0x40000);
  });

  it("gives every module a distinct single bit that is not a config bit", () => {
    const bits = Object.values(MODULE_EXCLUSION_BITS);
    expect(new Set(bits).size).toBe(bits.length);
    for (const bit of bits) {
      expect(bit).toBeGreaterThan(0);
      expect(bit & (bit - 1)).toBe(0);
      expect(bit).not.toBe(Excluded.BLUETOOTH_CONFIG);
      expect(bit).not.toBe(Excluded.NETWORK_CONFIG);
    }
  });
});

describe("isModuleExcluded", () => {
  it("excludes nothing when the mask is 0", () => {
    for (const module of Object.keys(MODULE_EXCLUSION_BITS)) {
      expect(
        isModuleExcluded(0, module as keyof typeof MODULE_EXCLUSION_BITS),
      ).toBe(false);
    }
  });

  it("reads each set bit", () => {
    const mask =
      Excluded.MQTT_CONFIG |
      Excluded.PAXCOUNTER_CONFIG |
      Excluded.TAK_CONFIG |
      Excluded.BLUETOOTH_CONFIG;
    expect(isModuleExcluded(mask, "mqtt")).toBe(true);
    expect(isModuleExcluded(mask, "paxcounter")).toBe(true);
    expect(isModuleExcluded(mask, "tak")).toBe(true);
    expect(isModuleExcluded(mask, "serial")).toBe(false);
    expect(isModuleExcluded(mask, "meshBeacon")).toBe(false);
    expect(isModuleExcluded(mask, "telemetry")).toBe(false);
  });
});
