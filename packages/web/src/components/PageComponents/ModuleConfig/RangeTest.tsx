import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type RangeTestValidation,
  RangeTestValidationSchema,
} from "@app/validation/moduleConfig/rangeTest.ts";
import { create } from "@bufbuild/protobuf";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { Protobuf } from "@meshtastic/core";
import { useTranslation } from "react-i18next";

interface RangeTestModuleConfigProps {
  onFormInit: DynamicFormFormInit<RangeTestValidation>;
}

export const RangeTest = ({ onFormInit }: RangeTestModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "rangeTest" });

  const {
    moduleConfig,
    setWorkingModuleConfig,
    getEffectiveModuleConfig,
    removeWorkingModuleConfig,
  } = useDevice();

  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: RangeTestValidation) => {
    if (deepCompareConfig(moduleConfig.rangeTest, data, true)) {
      removeWorkingModuleConfig("rangeTest");
      return;
    }

    setWorkingModuleConfig(
      create(Protobuf.ModuleConfig.ModuleConfigSchema, {
        payloadVariant: {
          case: "rangeTest",
          value: data,
        },
      }),
    );
  };

  return (
    <DynamicForm<RangeTestValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={RangeTestValidationSchema}
      formId="ModuleConfig_RangeTestConfig"
      defaultValues={moduleConfig.rangeTest}
      values={getEffectiveModuleConfig("rangeTest")}
      fieldGroups={[
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
      ]}
    />
  );
};
