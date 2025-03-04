import type { RangeTestValidation } from "@app/validation/moduleConfig/rangeTest.tsx";
import { create } from "@bufbuild/protobuf";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/core";

export const RangeTest = () => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();

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
      defaultValues={moduleConfig.rangeTest}
      fieldGroups={[
        {
          label: "Range Test Settings",
          description: "Settings for the Range Test module",
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: "Module Enabled",
              description: "Enable Range Test",
            },
            {
              type: "number",
              name: "sender",
              label: "Message Interval",
              description: "How long to wait between sending test packets",
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
              label: "Save CSV to storage",
              description: "ESP32 Only",
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
