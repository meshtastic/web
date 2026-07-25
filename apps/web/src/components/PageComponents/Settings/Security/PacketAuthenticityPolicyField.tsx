import { SelectInput } from "@components/Form/FormSelect.tsx";
import { FieldWrapper } from "@components/Form/FormWrapper.tsx";
import { Protobuf } from "@meshtastic/sdk";
import type { Control } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { RawSecurity } from "@app/validation/config/security.ts";
import { PACKET_SIGNATURE_POLICY_OPTIONS } from "./packetAuthenticityPolicy.ts";

const Policy = Protobuf.Config.Config_SecurityConfig_PacketSignaturePolicy;

export { PACKET_SIGNATURE_POLICY_OPTIONS } from "./packetAuthenticityPolicy.ts";

const POLICY_DESCRIPTION_KEYS: Record<
  Protobuf.Config.Config_SecurityConfig_PacketSignaturePolicy,
  string
> = {
  [Policy.COMPATIBLE]:
    "security.packetAuthenticity.options.compatible.description",
  [Policy.BALANCED]: "security.packetAuthenticity.options.balanced.description",
  [Policy.STRICT]: "security.packetAuthenticity.options.strict.description",
};

interface PacketAuthenticityPolicyFieldProps {
  control: Control<RawSecurity>;
  supported: boolean;
  validateSelection: (policyKey: string) => Promise<boolean>;
}

export const PacketAuthenticityPolicyField = ({
  control,
  supported,
  validateSelection,
}: PacketAuthenticityPolicyFieldProps) => {
  const { t } = useTranslation("config");
  const selectedPolicy = useWatch({
    control,
    name: "packetSignaturePolicy",
  });
  const description = supported
    ? t(POLICY_DESCRIPTION_KEYS[selectedPolicy] ?? POLICY_DESCRIPTION_KEYS[0])
    : t("security.packetAuthenticity.unavailable");

  return (
    <FieldWrapper
      label={t("security.packetAuthenticity.protectionLevel")}
      fieldName="packetSignaturePolicy"
      description={description}
    >
      <SelectInput<RawSecurity>
        control={control}
        disabled={!supported}
        field={{
          type: "select",
          name: "packetSignaturePolicy",
          label: t("security.packetAuthenticity.protectionLevel"),
          validate: validateSelection,
          properties: {
            enumValue: PACKET_SIGNATURE_POLICY_OPTIONS,
            optionLabels: {
              COMPATIBLE: t(
                "security.packetAuthenticity.options.compatible.label",
              ),
              BALANCED: t("security.packetAuthenticity.options.balanced.label"),
              STRICT: t("security.packetAuthenticity.options.strict.label"),
            },
            "aria-label": t("security.packetAuthenticity.protectionLevel"),
          },
        }}
      />
    </FieldWrapper>
  );
};
