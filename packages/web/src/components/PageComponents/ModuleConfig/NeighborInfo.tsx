import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type NeighborInfoValidation,
  NeighborInfoValidationSchema,
} from "@app/validation/moduleConfig/neighborInfo.ts";
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

interface NeighborInfoModuleConfigProps {
  onFormInit: DynamicFormFormInit<NeighborInfoValidation>;
}

export const NeighborInfo = ({ onFormInit }: NeighborInfoModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "neighborInfo" });

  const { moduleConfig, getEffectiveModuleConfig } = useDevice();
  const {
    registerFields,
    trackChange,
    removeChange: removeFieldChange,
  } = useFieldRegistry();
  const { t } = useTranslation("moduleConfig");
  const section = { type: "moduleConfig", variant: "neighborInfo" } as const;

  const onSubmit = (data: NeighborInfoValidation) => {
    // Track individual field changes
    const originalData = moduleConfig.neighborInfo;
    if (!originalData) {
      return;
    }

    (Object.keys(data) as Array<keyof NeighborInfoValidation>).forEach(
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
            disabledBy: [
              {
                fieldName: "enabled",
              },
            ],
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
    <DynamicForm<NeighborInfoValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={NeighborInfoValidationSchema}
      defaultValues={moduleConfig.neighborInfo}
      values={getEffectiveModuleConfig("neighborInfo")}
      fieldGroups={fieldGroups}
    />
  );
};
