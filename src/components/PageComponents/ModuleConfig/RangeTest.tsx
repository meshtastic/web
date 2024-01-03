import type { RangeTestValidation } from "@app/validation/moduleConfig/rangeTest.js";
import { DynamicForm } from "@components/Form/DynamicForm.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/js";

export const RangeTest = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();

  const onSubmit = (data: RangeTestValidation) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig.ModuleConfig({
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
