import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { describe, expect, it } from "vitest";
import { moduleState } from "./moduleState.ts";

const MC = Protobuf.ModuleConfig;

describe("moduleState", () => {
  it("is undefined before the module's config arrives", () => {
    expect(moduleState("mqtt", {})).toBeUndefined();
  });

  it("reads the module's enabled flag", () => {
    const modules = {
      mqtt: create(MC.ModuleConfig_MQTTConfigSchema, { enabled: true }),
      serial: create(MC.ModuleConfig_SerialConfigSchema, { enabled: false }),
      ambientLighting: create(MC.ModuleConfig_AmbientLightingConfigSchema, {
        ledState: true,
      }),
    };
    expect(moduleState("mqtt", modules)).toBe("on");
    expect(moduleState("serial", modules)).toBe("off");
    expect(moduleState("ambientLighting", modules)).toBe("on");
  });

  it("counts telemetry as on when any measurement is enabled", () => {
    const off = create(MC.ModuleConfig_TelemetryConfigSchema, {});
    const on = create(MC.ModuleConfig_TelemetryConfigSchema, {
      airQualityEnabled: true,
    });
    expect(moduleState("telemetry", { telemetry: off })).toBe("off");
    expect(moduleState("telemetry", { telemetry: on })).toBe("on");
  });

  it("has no state for modules without a single switch", () => {
    const canned = create(MC.ModuleConfig_CannedMessageConfigSchema, {});
    expect(moduleState("cannedMessage", { cannedMessage: canned })).toBe(
      undefined,
    );
    expect(moduleState("tak", {})).toBeUndefined();
  });
});
