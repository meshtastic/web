import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import { withLoRaDefaults } from "./lora.ts";

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

describe("LoRa validation", () => {
  it("defaults an omitted serialHalOnly form value to false", () => {
    const { serialHalOnly: _, ...legacyConfig } = create(
      Protobuf.Config.Config_LoRaConfigSchema,
    );

    expect(withLoRaDefaults(legacyConfig).serialHalOnly).toBe(false);
  });
});
