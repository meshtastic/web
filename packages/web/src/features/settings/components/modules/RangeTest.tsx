import { useModuleConfigForm } from "../../hooks/useModuleConfigForm";
import {
  type RangeTestValidation,
  RangeTestValidationSchema,
} from "../../validation/moduleConfig/rangeTest";
import {
  ConfigFormFields,
  type FieldGroup,
} from "../form/ConfigFormFields";
import { ConfigFormSkeleton } from "../../pages/SettingsLoading";
import { useRemoteAdminAuth } from "@shared/hooks";
import { useTranslation } from "react-i18next";

export const RangeTest = () => {
  const { t } = useTranslation("moduleConfig");
  const { isAuthorized } = useRemoteAdminAuth();
  const { form, isReady, isDisabledByField } =
    useModuleConfigForm<RangeTestValidation>({
      moduleConfigType: "rangeTest",
      schema: RangeTestValidationSchema,
    });

  if (!isReady) {
    return <ConfigFormSkeleton />;
  }

  const fieldGroups: FieldGroup<RangeTestValidation>[] = [
    {
      label: t("rangeTest.title"),
      description: t("rangeTest.description"),
      fields: [
        {
          type: "toggle",
          name: "enabled",
          label: t("rangeTest.enabled.label"),
          description: t("rangeTest.enabled.description"),
        },
        {
          type: "number",
          name: "sender",
          label: t("rangeTest.sender.label"),
          description: t("rangeTest.sender.description"),
          properties: {
            suffix: t("unit.second.plural"),
          },
          disabledBy: [{ fieldName: "enabled" }],
        },
        {
          type: "toggle",
          name: "save",
          label: t("rangeTest.save.label"),
          description: t("rangeTest.save.description"),
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
