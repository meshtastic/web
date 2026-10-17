import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import { toDeviceConfig, toDeviceFormValues } from "./device.ts";

describe("Device toggles shown as on Android", () => {
  it("shows the inverse of disableTripleClick and ledHeartbeatDisabled", () => {
    const values = toDeviceFormValues(
      create(Protobuf.Config.Config_DeviceConfigSchema, {
        disableTripleClick: true,
        ledHeartbeatDisabled: false,
      }),
    );
    expect(values.tripleClickAdHocPing).toBe(false);
    expect(values.ledHeartbeat).toBe(true);
  });

  it("writes the proto fields back, without the form-only names", () => {
    const values = toDeviceFormValues(
      create(Protobuf.Config.Config_DeviceConfigSchema),
    );
    const cfg = toDeviceConfig({
      ...values,
      tripleClickAdHocPing: false,
      ledHeartbeat: false,
    });
    expect(cfg.disableTripleClick).toBe(true);
    expect(cfg.ledHeartbeatDisabled).toBe(true);
    expect(cfg).not.toHaveProperty("tripleClickAdHocPing");
    expect(cfg).not.toHaveProperty("ledHeartbeat");
  });
});
