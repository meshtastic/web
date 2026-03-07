import { Protobuf } from "@meshtastic/core";
import { describe, expect, it } from "vitest";

describe("LoRa modem presets", () => {
  it("includes LONG_TURBO modem preset", () => {
    expect(
      Object.prototype.hasOwnProperty.call(
        Protobuf.Config.Config_LoRaConfig_ModemPreset,
        "LONG_TURBO",
      ),
    ).toBe(true);
  });
});
