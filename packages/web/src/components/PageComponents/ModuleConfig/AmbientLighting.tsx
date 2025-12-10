import { useModuleConfigForm } from "@app/pages/Settings/hooks/useModuleConfigForm";
import {
  type AmbientLightingValidation,
  AmbientLightingValidationSchema,
} from "@app/validation/moduleConfig/ambientLighting";
import {
  ConfigFormFields,
  type FieldGroup,
} from "@components/Form/ConfigFormFields";
import { ConfigFormSkeleton } from "@pages/Settings/SettingsLoading";
import { useTranslation } from "react-i18next";

export const AmbientLighting = () => {
  const { t } = useTranslation("moduleConfig");
  const { form, isReady, isDisabledByField } =
    useModuleConfigForm<AmbientLightingValidation>({
      moduleConfigType: "ambientLighting",
      schema: AmbientLightingValidationSchema,
    });

  if (!isReady) {
    return <ConfigFormSkeleton />;
  }

  const fieldGroups: FieldGroup<AmbientLightingValidation>[] = [
    {
      label: t("ambientLighting.title"),
      description: t("ambientLighting.description"),
      fields: [
        {
          type: "toggle",
          name: "ledState",
          label: t("ambientLighting.ledState.label"),
          description: t("ambientLighting.ledState.description"),
        },
        {
          type: "number",
          name: "current",
          label: t("ambientLighting.current.label"),
          description: t("ambientLighting.current.description"),
        },
        {
          type: "number",
          name: "red",
          label: t("ambientLighting.red.label"),
          description: t("ambientLighting.red.description"),
        },
        {
          type: "number",
          name: "green",
          label: t("ambientLighting.green.label"),
          description: t("ambientLighting.green.description"),
        },
        {
          type: "number",
          name: "blue",
          label: t("ambientLighting.blue.label"),
          description: t("ambientLighting.blue.description"),
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
