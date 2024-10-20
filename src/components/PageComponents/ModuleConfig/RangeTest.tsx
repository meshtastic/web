import type { RangeTestValidation } from "@app/validation/moduleConfig/rangeTest.tsx";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { useTranslation } from "react-i18next";
import { Protobuf } from "@meshtastic/js";

export const RangeTest = (): JSX.Element => {
  const { t } = useTranslation();
  const { moduleConfig, setWorkingModuleConfig } = useDevice();

  const onSubmit = (data: RangeTestValidation) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig.ModuleConfig({
        payloadVariant: {
          case: "rangeTest",
          value: data,
        },
      })
    );
  };

  return (
    <DynamicForm<RangeTestValidation>
      onSubmit={onSubmit}
      defaultValues={moduleConfig.rangeTest}
      fieldGroups={[
        {
          label: t("Range Test Settings"),
          description: t("Settings for the Range Test module"),
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("Module Enabled"),
              description: t("Enable Range Test"),
            },
            {
              type: "number",
              name: "sender",
              label: t("Message Interval"),
              description: t("How long to wait between sending test packets"),
              properties: {
                suffix: "Seconds",
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
              label: t("Save CSV to storage"),
              description: t("ESP32 Only"),
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
