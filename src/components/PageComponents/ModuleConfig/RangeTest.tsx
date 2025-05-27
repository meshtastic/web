import {
  type RangeTestValidation,
  RangeTestValidationSchema,
} from "@app/validation/moduleConfig/rangeTest.ts";
import { create } from "@bufbuild/protobuf";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/core";
import { useTranslation } from "react-i18next";

export const RangeTest = () => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();
  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: RangeTestValidation) => {
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
      validationSchema={RangeTestValidationSchema}
      formId="ModuleConfig_RangeTestConfig"
      defaultValues={moduleConfig.rangeTest}
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
