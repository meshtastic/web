import { useModuleConfigForm } from "../../hooks/useModuleConfigForm";
import {
  type StoreForwardValidation,
  StoreForwardValidationSchema,
} from "../../validation/moduleConfig/storeForward";
import {
  ConfigFormFields,
  type FieldGroup,
} from "../form/ConfigFormFields";
import { ConfigFormSkeleton } from "../../pages/SettingsLoading";
import { useRemoteAdminAuth } from "@shared/hooks";
import { useTranslation } from "react-i18next";

export const StoreForward = () => {
  const { t } = useTranslation("moduleConfig");
  const { isAuthorized } = useRemoteAdminAuth();
  const { form, isReady, isDisabledByField } =
    useModuleConfigForm<StoreForwardValidation>({
      moduleConfigType: "storeForward",
      schema: StoreForwardValidationSchema,
    });

  if (!isReady) {
    return <ConfigFormSkeleton />;
  }

  const fieldGroups: FieldGroup<StoreForwardValidation>[] = [
    {
      label: t("storeForward.title"),
      description: t("storeForward.description"),
      fields: [
        {
          type: "toggle",
          name: "enabled",
          label: t("storeForward.enabled.label"),
          description: t("storeForward.enabled.description"),
        },
        {
          type: "toggle",
          name: "heartbeat",
          label: t("storeForward.heartbeat.label"),
          description: t("storeForward.heartbeat.description"),
          disabledBy: [{ fieldName: "enabled" }],
        },
        {
          type: "number",
          name: "records",
          label: t("storeForward.records.label"),
          description: t("storeForward.records.description"),
          disabledBy: [{ fieldName: "enabled" }],
          properties: {
            suffix: t("unit.record.plural"),
          },
        },
        {
          type: "number",
          name: "historyReturnMax",
          label: t("storeForward.historyReturnMax.label"),
          description: t("storeForward.historyReturnMax.description"),
          disabledBy: [{ fieldName: "enabled" }],
        },
        {
          type: "number",
          name: "historyReturnWindow",
          label: t("storeForward.historyReturnWindow.label"),
          description: t("storeForward.historyReturnWindow.description"),
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
