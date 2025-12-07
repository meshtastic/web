import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type AmbientLightingValidation,
  AmbientLightingValidationSchema,
} from "@app/validation/moduleConfig/ambientLighting.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import {
  createFieldMetadata,
  useFieldRegistry,
} from "@core/services/fieldRegistry";
import { useDevice } from "@core/stores";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

interface AmbientLightingModuleConfigProps {
  onFormInit: DynamicFormFormInit<AmbientLightingValidation>;
}

export const AmbientLighting = ({
  onFormInit,
}: AmbientLightingModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "ambientLighting" });
  const { moduleConfig, getEffectiveModuleConfig } = useDevice();
  const {
    registerFields,
    trackChange,
    removeChange: removeFieldChange,
  } = useFieldRegistry();
  const { t } = useTranslation("moduleConfig");

  const section = { type: "moduleConfig", variant: "ambientLighting" } as const;

  const onSubmit = (data: AmbientLightingValidation) => {
    // Track individual field changes
    const originalData = moduleConfig.ambientLighting;
    if (!originalData) {
      return;
    }

    (Object.keys(data) as Array<keyof AmbientLightingValidation>).forEach(
      (fieldName) => {
        const newValue = data[fieldName];
        const oldValue = originalData[fieldName];

        if (newValue !== oldValue) {
          trackChange(section, fieldName as string, newValue, oldValue);
        } else {
          removeFieldChange(section, fieldName as string);
        }
      },
    );
  };

  const fieldGroups = useMemo(
    () => [
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
    ],
    [t],
  );

  // Register fields on mount
  useEffect(() => {
    const metadata = createFieldMetadata(section, fieldGroups);
    registerFields(section, metadata);
  }, [registerFields, fieldGroups, section]);

  return (
    <DynamicForm<AmbientLightingValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={AmbientLightingValidationSchema}
      defaultValues={moduleConfig.ambientLighting}
      values={getEffectiveModuleConfig("ambientLighting")}
      fieldGroups={fieldGroups}
    />
  );
};
