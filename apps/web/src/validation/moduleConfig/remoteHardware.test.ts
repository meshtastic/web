import { isMessage } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import {
  REMOTE_HARDWARE_MAX_PINS,
  type RemoteHardwareValidation,
  RemoteHardwareValidationSchema,
  toRemoteHardwareConfig,
} from "./remoteHardware.ts";

const PinType = Protobuf.ModuleConfig.RemoteHardwarePinType;

const pin = (gpioPin: number, name = "Door") => ({
  gpioPin,
  name,
  type: PinType.DIGITAL_READ,
});

const valid: RemoteHardwareValidation = {
  enabled: true,
  allowUndefinedPinAccess: false,
  availablePins: [pin(12)],
};

describe("RemoteHardwareValidationSchema", () => {
  it("accepts a valid config", () => {
    expect(RemoteHardwareValidationSchema.safeParse(valid).success).toBe(true);
  });

  it("allows at most four pins", () => {
    const parse = (count: number) =>
      RemoteHardwareValidationSchema.safeParse({
        ...valid,
        availablePins: Array.from({ length: count }, (_, i) => pin(i)),
      }).success;
    expect(parse(REMOTE_HARDWARE_MAX_PINS)).toBe(true);
    expect(parse(REMOTE_HARDWARE_MAX_PINS + 1)).toBe(false);
  });

  it("limits a pin name to 14 bytes", () => {
    const parse = (name: string) =>
      RemoteHardwareValidationSchema.safeParse({
        ...valid,
        availablePins: [pin(1, name)],
      }).success;
    expect(parse("a".repeat(14))).toBe(true);
    expect(parse("é".repeat(8))).toBe(false);
  });

  it("coerces a typed pin number and rejects a negative one", () => {
    const parse = (gpioPin: unknown) =>
      RemoteHardwareValidationSchema.safeParse({
        ...valid,
        availablePins: [{ ...pin(0), gpioPin }],
      });
    expect(parse("7").data?.availablePins[0]?.gpioPin).toBe(7);
    expect(parse(-1).success).toBe(false);
  });
});

describe("toRemoteHardwareConfig", () => {
  it("builds each pin as a protobuf message", () => {
    const config = toRemoteHardwareConfig(valid);
    const [first] = config.availablePins ?? [];
    expect(
      first && isMessage(first, Protobuf.ModuleConfig.RemoteHardwarePinSchema),
    ).toBe(true);
    expect(first?.gpioPin).toBe(12);
    expect(first?.name).toBe("Door");
    expect(first?.type).toBe(PinType.DIGITAL_READ);
    expect(config.enabled).toBe(true);
  });
});
