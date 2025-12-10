import { useModuleConfigForm } from "@app/pages/Settings/hooks/useModuleConfigForm";
import {
  type NeighborInfoValidation,
  NeighborInfoValidationSchema,
} from "@app/validation/moduleConfig/neighborInfo";
import {
  ConfigFormFields,
  type FieldGroup,
} from "@components/Form/ConfigFormFields";
import { ConfigFormSkeleton } from "@pages/Settings/SettingsLoading";
import { useTranslation } from "react-i18next";

export const NeighborInfo = () => {
  const { t } = useTranslation("moduleConfig");
  const { form, isReady, isDisabledByField } =
    useModuleConfigForm<NeighborInfoValidation>({
      moduleConfigType: "neighborInfo",
      schema: NeighborInfoValidationSchema,
    });

  if (!isReady) {
    return <ConfigFormSkeleton />;
  }

  const fieldGroups: FieldGroup<NeighborInfoValidation>[] = [
    {
      label: t("neighborInfo.title"),
      description: t("neighborInfo.description"),
      fields: [
        {
          type: "toggle",
          name: "enabled",
          label: t("neighborInfo.enabled.label"),
          description: t("neighborInfo.enabled.description"),
        },
        {
          type: "number",
          name: "updateInterval",
          label: t("neighborInfo.updateInterval.label"),
          description: t("neighborInfo.updateInterval.description"),
          properties: {
            suffix: t("unit.second.plural"),
          },
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
    />
  );
};
