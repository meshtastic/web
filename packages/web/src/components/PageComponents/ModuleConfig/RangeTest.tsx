import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type RangeTestValidation,
  RangeTestValidationSchema,
} from "@app/validation/moduleConfig/rangeTest.ts";
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

interface RangeTestModuleConfigProps {
  onFormInit: DynamicFormFormInit<RangeTestValidation>;
}

export const RangeTest = ({ onFormInit }: RangeTestModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "rangeTest" });

  const { moduleConfig, getEffectiveModuleConfig } = useDevice();
  const {
    registerFields,
    trackChange,
    removeChange: removeFieldChange,
  } = useFieldRegistry();
  const { t } = useTranslation("moduleConfig");
  const section = { type: "moduleConfig", variant: "rangeTest" } as const;

  const onSubmit = (data: RangeTestValidation) => {
    // Track individual field changes
    const originalData = moduleConfig.rangeTest;
    if (!originalData) {
      return;
    }

    (Object.keys(data) as Array<keyof RangeTestValidation>).forEach(
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
            disabledBy: [
              {
                fieldName: "enabled",
              },
            ],
          },
          {
            type: "toggle",
            name: "save",
            label: t("rangeTest.save.label"),
            description: t("rangeTest.save.description"),
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
    <DynamicForm<RangeTestValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={RangeTestValidationSchema}
      defaultValues={moduleConfig.rangeTest}
      values={getEffectiveModuleConfig("rangeTest")}
      fieldGroups={fieldGroups}
    />
  );
};
