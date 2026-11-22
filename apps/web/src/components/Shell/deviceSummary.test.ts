import type { Connection } from "@core/stores/deviceStore/types.ts";
import { describe, expect, it } from "vitest";
import {
  connectionTarget,
  deriveDeviceSummary,
  deviceCardFacts,
  deviceConnectionState,
  deviceListEntries,
  deviceMenuActions,
  formatPercent,
  deviceVoltage,
  isConnectedStatus,
  isInProgress,
  parseFirmwareVersion,
  powerState,
  presenceForState,
} from "./deviceSummary.ts";

const fallbackName = (suffix: string) => `Meshtastic ${suffix}`;

const serial = (overrides: Partial<{ status: Connection["status"] }> = {}) =>
  ({
    id: 1,
    name: "My radio",
    createdAt: 0,
    status: overrides.status ?? "configured",
    type: "serial",
    usbVendorId: 0x303a,
    usbProductId: 0x1001,
  }) satisfies Connection;

describe("powerState", () => {
  it("reads levels above 100 as external power", () => {
    expect(powerState(101)).toEqual({ kind: "pluggedIn" });
  });

  it("rounds battery levels", () => {
    expect(powerState(87.6)).toEqual({ kind: "battery", level: 88 });
    expect(powerState(0)).toEqual({ kind: "battery", level: 0 });
  });

  it("is undefined without a reading", () => {
    expect(powerState(undefined)).toBeUndefined();
    expect(powerState(null)).toBeUndefined();
    expect(powerState(Number.NaN)).toBeUndefined();
  });
});

describe("deviceVoltage", () => {
  it("shows two decimals in the locale's format", () => {
    expect(deviceVoltage(4.3512, "en")).toBe("4.35");
    expect(deviceVoltage(-3.7, "en")).toBe("3.70");
    expect(deviceVoltage(3.7, "de")).toBe("3,70");
  });

  it("treats zero and missing as unknown", () => {
    expect(deviceVoltage(0, "en")).toBeUndefined();
    expect(deviceVoltage(undefined, "en")).toBeUndefined();
  });
});

describe("formatPercent", () => {
  it("rounds to one decimal and drops a trailing zero", () => {
    expect(formatPercent(12.345)).toBe("12.3");
    expect(formatPercent(7)).toBe("7");
  });

  it("is undefined for missing or negative values", () => {
    expect(formatPercent(undefined)).toBeUndefined();
    expect(formatPercent(-1)).toBeUndefined();
  });
});

describe("parseFirmwareVersion", () => {
  it("splits release and build hash", () => {
    expect(parseFirmwareVersion("2.8.1.8e6a88d")).toEqual({
      version: "2.8.1",
      build: "8e6a88d",
    });
  });

  it("accepts a bare release", () => {
    expect(parseFirmwareVersion("2.7.15")).toEqual({ version: "2.7.15" });
  });

  it("keeps unrecognised strings verbatim", () => {
    expect(parseFirmwareVersion("custom-build")).toEqual({
      version: "custom-build",
    });
  });

  it("is undefined when empty", () => {
    expect(parseFirmwareVersion("")).toBeUndefined();
    expect(parseFirmwareVersion(undefined)).toBeUndefined();
  });
});

describe("connectionTarget", () => {
  it("formats serial vendor and product ids as hex", () => {
    expect(connectionTarget(serial())).toBe("303a:1001");
  });

  it("uses the Bluetooth device name", () => {
    expect(
      connectionTarget({
        id: 2,
        name: "BLE",
        createdAt: 0,
        status: "connected",
        type: "bluetooth",
        deviceName: "Meshtastic_5a97",
      }),
    ).toBe("Meshtastic_5a97");
  });

  it("uses the HTTP host", () => {
    expect(
      connectionTarget({
        id: 3,
        name: "Net",
        createdAt: 0,
        status: "connected",
        type: "http",
        url: "http://192.168.1.20:8080/",
      }),
    ).toBe("192.168.1.20:8080");
  });
});

describe("isConnectedStatus", () => {
  it("counts connected, configured and online", () => {
    expect(isConnectedStatus("connected")).toBe(true);
    expect(isConnectedStatus("configured")).toBe(true);
    expect(isConnectedStatus("online")).toBe(true);
    expect(isConnectedStatus("configuring")).toBe(false);
    expect(isConnectedStatus(undefined)).toBe(false);
  });
});

describe("deriveDeviceSummary", () => {
  it("combines node, metadata and connection", () => {
    const summary = deriveDeviceSummary({
      myNode: {
        num: 0x71275a97,
        user: { longName: "EAO1 base", shortName: "EAO1" },
        deviceMetrics: {
          batteryLevel: 101,
          voltage: 4.35,
          channelUtilization: 18.25,
          airUtilTx: 2.04,
        },
      },
      firmwareVersion: "2.8.1.8e6a88d",
      connection: serial(),
      fallbackName,
      unknownName: "Unknown",
      locale: "en",
    });
    expect(summary).toEqual({
      name: "EAO1 base",
      initials: "EAO1",
      connected: true,
      state: "connected",
      transport: "serial",
      target: "303a:1001",
      power: { kind: "pluggedIn" },
      voltage: "4.35",
      firmware: { version: "2.8.1", build: "8e6a88d" },
      channelUtilization: "18.3",
      airUtilTx: "2",
    });
  });

  it("falls back to the connection name before the node is known", () => {
    const summary = deriveDeviceSummary({
      connection: serial({ status: "configuring" }),
      fallbackName,
      unknownName: "Unknown",
      locale: "en",
    });
    expect(summary.name).toBe("My radio");
    expect(summary.initials).toBe("My r");
    expect(summary.connected).toBe(false);
  });

  it("uses the unknown name with nothing to go on", () => {
    expect(
      deriveDeviceSummary({
        fallbackName,
        unknownName: "Unknown",
        locale: "en",
      }).name,
    ).toBe("Unknown");
  });
});

describe("deviceCardFacts", () => {
  it("lists transport, voltage and firmware in order, skipping gaps", () => {
    expect(
      deviceCardFacts({
        name: "x",
        initials: "x",
        connected: true,
        state: "connected",
        transport: "serial",
        voltage: "4.35",
        firmware: { version: "2.8.1" },
      }),
    ).toEqual([
      { kind: "transport", transport: "serial" },
      { kind: "voltage", value: "4.35" },
      { kind: "firmware", version: "2.8.1" },
    ]);
    expect(
      deviceCardFacts({
        name: "x",
        initials: "x",
        state: "connected",
        connected: true,
      }),
    ).toEqual([]);
  });

  it("leads with the connection state when not connected", () => {
    expect(
      deviceCardFacts({
        name: "x",
        initials: "x",
        state: "configuring",
        connected: false,
        transport: "bluetooth",
      }),
    ).toEqual([
      { kind: "state", state: "configuring" },
      { kind: "transport", transport: "bluetooth" },
    ]);
  });
});

describe("deviceConnectionState", () => {
  it.each([
    ["connected", "connected"],
    ["configured", "connected"],
    ["online", "connected"],
    ["connecting", "connecting"],
    ["configuring", "configuring"],
    ["error", "error"],
    ["disconnected", "offline"],
    ["disconnecting", "offline"],
  ] as const)("maps %s to %s", (status, expected) => {
    expect(deviceConnectionState({ status })).toBe(expected);
  });

  it("reads a pending reconnect as connecting", () => {
    expect(
      deviceConnectionState({
        status: "error",
        reconnect: { attempt: 2, maxAttempts: 5 },
      }),
    ).toBe("connecting");
  });

  it("is offline without a connection", () => {
    expect(deviceConnectionState(undefined)).toBe("offline");
  });
});

describe("presenceForState / isInProgress", () => {
  it("uses amber for in-progress states and red for errors", () => {
    expect(presenceForState.connected).toBe("online");
    expect(presenceForState.connecting).toBe("connecting");
    expect(presenceForState.configuring).toBe("connecting");
    expect(presenceForState.error).toBe("error");
    expect(presenceForState.offline).toBe("offline");
    expect(isInProgress("configuring")).toBe(true);
    expect(isInProgress("connecting")).toBe(true);
    expect(isInProgress("error")).toBe(false);
  });
});

describe("deviceMenuActions", () => {
  it("offers reboot and disconnect only while connected", () => {
    expect(deviceMenuActions(true).map((a) => a.id)).toEqual([
      "deviceSettings",
      "manageConnections",
      "reboot",
      "disconnect",
    ]);
    expect(deviceMenuActions(false).map((a) => a.id)).toEqual([
      "deviceSettings",
      "manageConnections",
    ]);
  });

  it("marks disconnect as dangerous", () => {
    expect(deviceMenuActions(true).find((a) => a.id === "disconnect")).toEqual({
      id: "disconnect",
      tone: "danger",
    });
  });
});

describe("deviceListEntries", () => {
  it("names each known radio and flags the active one", () => {
    const entries = deviceListEntries(
      [
        { id: 10, myNodeNum: 0x1234 },
        { id: 11, myNodeNum: 0 },
        { id: 12, myNodeNum: 0xabcd },
      ],
      12,
      (num) =>
        num === 0xabcd ? { longName: "Base", shortName: "BS" } : undefined,
      fallbackName,
    );
    expect(entries).toEqual([
      { id: 10, name: "Meshtastic 1234", initials: "1234", active: false },
      { id: 12, name: "Base", initials: "BS", active: true },
    ]);
  });

  it("falls back to each device's own saved connection name", () => {
    const entries = deviceListEntries(
      [
        { id: 20, myNodeNum: 0x5678, connectionName: "Garage radio" },
        { id: 21, connectionName: "Kitchen" },
        { id: 22, myNodeNum: 0xabcd, connectionName: "Ignored" },
      ],
      20,
      (num) => (num === 0xabcd ? { longName: "Base" } : undefined),
      fallbackName,
    );
    expect(entries).toEqual([
      { id: 20, name: "Garage radio", initials: "Gara", active: true },
      { id: 21, name: "Kitchen", initials: "Kitc", active: false },
      { id: 22, name: "Base", initials: "B", active: false },
    ]);
  });
});
