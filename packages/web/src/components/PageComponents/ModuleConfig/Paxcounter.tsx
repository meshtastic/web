import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type PaxcounterValidation,
  PaxcounterValidationSchema,
} from "@app/validation/moduleConfig/paxcounter.ts";
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

interface PaxcounterModuleConfigProps {
  onFormInit: DynamicFormFormInit<PaxcounterValidation>;
}

export const Paxcounter = ({ onFormInit }: PaxcounterModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "paxcounter" });

  const { moduleConfig, getEffectiveModuleConfig } = useDevice();
  const {
    registerFields,
    trackChange,
    removeChange: removeFieldChange,
  } = useFieldRegistry();
  const { t } = useTranslation("moduleConfig");
  const section = { type: "moduleConfig", variant: "paxcounter" } as const;

  const onSubmit = (data: PaxcounterValidation) => {
    // Track individual field changes
    const originalData = moduleConfig.paxcounter;
    if (!originalData) {
      return;
    }

    (Object.keys(data) as Array<keyof PaxcounterValidation>).forEach(
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
            disabledBy: [
              {
                fieldName: "enabled",
              },
            ],
          },
          {
            type: "number",
            name: "wifiThreshold",
            label: t("paxcounter.wifiThreshold.label"),
            description: t("paxcounter.wifiThreshold.description"),
            disabledBy: [
              {
                fieldName: "enabled",
              },
            ],
          },
          {
            type: "number",
            name: "bleThreshold",
            label: t("paxcounter.bleThreshold.label"),
            description: t("paxcounter.bleThreshold.description"),
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
    <DynamicForm<PaxcounterValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={PaxcounterValidationSchema}
      defaultValues={moduleConfig.paxcounter}
      values={getEffectiveModuleConfig("paxcounter")}
      fieldGroups={fieldGroups}
    />
  );
};
