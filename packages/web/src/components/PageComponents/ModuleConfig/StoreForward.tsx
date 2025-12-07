import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type StoreForwardValidation,
  StoreForwardValidationSchema,
} from "@app/validation/moduleConfig/storeForward.ts";
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

interface StoreForwardModuleConfigProps {
  onFormInit: DynamicFormFormInit<StoreForwardValidation>;
}

export const StoreForward = ({ onFormInit }: StoreForwardModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "storeForward" });

  const { moduleConfig, getEffectiveModuleConfig } = useDevice();
  const {
    registerFields,
    trackChange,
    removeChange: removeFieldChange,
  } = useFieldRegistry();
  const { t } = useTranslation("moduleConfig");

  const section = { type: "moduleConfig", variant: "storeForward" } as const;

  const onSubmit = (data: StoreForwardValidation) => {
    // Track individual field changes
    const originalData = moduleConfig.storeForward;
    if (!originalData) {
      return;
    }

    (Object.keys(data) as Array<keyof StoreForwardValidation>).forEach(
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
            disabledBy: [
              {
                fieldName: "enabled",
              },
            ],
          },
          {
            type: "number",
            name: "records",
            label: t("storeForward.records.label"),
            description: t("storeForward.records.description"),
            disabledBy: [
              {
                fieldName: "enabled",
              },
            ],
            properties: {
              suffix: t("unit.record.plural"),
            },
          },
          {
            type: "number",
            name: "historyReturnMax",
            label: t("storeForward.historyReturnMax.label"),
            description: t("storeForward.historyReturnMax.description"),
            disabledBy: [
              {
                fieldName: "enabled",
              },
            ],
          },
          {
            type: "number",
            name: "historyReturnWindow",
            label: t("storeForward.historyReturnWindow.label"),
            description: t("storeForward.historyReturnWindow.description"),
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
    <DynamicForm<StoreForwardValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={StoreForwardValidationSchema}
      defaultValues={moduleConfig.storeForward}
      values={getEffectiveModuleConfig("storeForward")}
      fieldGroups={fieldGroups}
    />
  );
};
