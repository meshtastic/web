import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it, vi } from "vitest";
import type { RawSecurity } from "@app/validation/config/security.ts";
import {
  submitSecurityConfig,
  toFormShape,
  toSecurityPayload,
} from "./Security.tsx";

const Policy = Protobuf.Config.Config_SecurityConfig_PacketSignaturePolicy;

const rawSecurity = (
  packetSignaturePolicy: RawSecurity["packetSignaturePolicy"],
) =>
  ({
    isManaged: false,
    adminChannelEnabled: false,
    debugLogApiEnabled: false,
    serialEnabled: true,
    packetSignaturePolicy,
    privateKey: "",
    publicKey: "",
    adminKey: ["", "", ""],
  }) satisfies RawSecurity;

describe("Security packet authenticity persistence", () => {
  it("maps an absent firmware policy to Compatible", () => {
    const form = toFormShape({} as Protobuf.Config.Config_SecurityConfig);

    expect(form.packetSignaturePolicy).toBe(Policy.COMPATIBLE);
  });

  it.each([Policy.COMPATIBLE, Policy.BALANCED, Policy.STRICT])(
    "preserves policy %s when mapping firmware config into the form",
    (packetSignaturePolicy) => {
      const form = toFormShape({
        packetSignaturePolicy,
      } as Protobuf.Config.Config_SecurityConfig);

      expect(form.packetSignaturePolicy).toBe(packetSignaturePolicy);
    },
  );

  it.each([Policy.COMPATIBLE, Policy.BALANCED, Policy.STRICT])(
    "preserves policy %s when mapping the form to a security payload",
    (packetSignaturePolicy) => {
      expect(
        toSecurityPayload(rawSecurity(packetSignaturePolicy))
          .packetSignaturePolicy,
      ).toBe(packetSignaturePolicy);
    },
  );

  it.each([Policy.COMPATIBLE, Policy.BALANCED, Policy.STRICT])(
    "submits policy %s through the security radio section",
    (packetSignaturePolicy) => {
      const setRadioSection = vi.fn();

      submitSecurityConfig(setRadioSection, rawSecurity(packetSignaturePolicy));

      expect(setRadioSection).toHaveBeenCalledWith(
        "security",
        expect.objectContaining({ packetSignaturePolicy }),
      );
    },
  );
});
