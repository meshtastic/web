import { useModuleConfigForm } from "../../hooks/useModuleConfigForm";
import {
  type PaxcounterValidation,
  PaxcounterValidationSchema,
} from "../../validation/moduleConfig/paxcounter";
import {
  ConfigFormFields,
  type FieldGroup,
} from "../form/ConfigFormFields";
import { ConfigFormSkeleton } from "../../pages/SettingsLoading";
import { useRemoteAdminAuth } from "@shared/hooks";
import { useTranslation } from "react-i18next";

export const Paxcounter = () => {
  const { t } = useTranslation("moduleConfig");
  const { isAuthorized } = useRemoteAdminAuth();
  const { form, isReady, isDisabledByField } =
    useModuleConfigForm<PaxcounterValidation>({
      moduleConfigType: "paxcounter",
      schema: PaxcounterValidationSchema,
    });

  if (!isReady) {
    return <ConfigFormSkeleton />;
  }

  const fieldGroups: FieldGroup<PaxcounterValidation>[] = [
    {
      label: t("paxcounter.title"),
      description: t("paxcounter.description"),
      fields: [
        {
          type: "toggle",
          name: "enabled",
          label: t("paxcounter.enabled.label"),
          description: t("paxcounter.enabled.description"),
        },
        {
          type: "number",
          name: "paxcounterUpdateInterval",
          label: t("paxcounter.paxcounterUpdateInterval.label"),
          description: t("paxcounter.paxcounterUpdateInterval.description"),
          properties: {
            suffix: t("unit.second.plural"),
          },
          disabledBy: [{ fieldName: "enabled" }],
        },
        {
          type: "number",
          name: "wifiThreshold",
          label: t("paxcounter.wifiThreshold.label"),
          description: t("paxcounter.wifiThreshold.description"),
          disabledBy: [{ fieldName: "enabled" }],
        },
        {
          type: "number",
          name: "bleThreshold",
          label: t("paxcounter.bleThreshold.label"),
          description: t("paxcounter.bleThreshold.description"),
          disabledBy: [{ fieldName: "enabled" }],
        },
      ],
    },
  ];

  return (
    <ConfigFormFields
      form={form}
      fieldGroups={fieldGroups}
      isDisabledByField={isDisabledByField}
      disabled={!isAuthorized}
    />
  );
};
