import type { StoreForwardValidation } from "@app/validation/moduleConfig/storeForward.js";
import { DynamicForm } from "@components/Form/DynamicForm.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/js";

export const StoreForward = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();

  const onSubmit = (data: StoreForwardValidation) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig.ModuleConfig({
        payloadVariant: {
          case: "storeForward",
          value: data,
        },
      }),
    );
  };

  return (
    <DynamicForm<StoreForwardValidation>
      onSubmit={onSubmit}
      defaultValues={moduleConfig.storeForward}
      fieldGroups={[
        {
          label: "Store & Forward Settings",
          description: "Settings for the Store & Forward module",
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: "Module Enabled",
              description: "Enable Store & Forward",
            },
            {
              type: "toggle",
              name: "heartbeat",
              label: "Heartbeat Enabled",
              description: "Enable Store & Forward heartbeat",
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "records",
              label: "Number of records",
              description: "Number of records to store",

              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
              properties: {
                suffix: "Records",
              },
            },
            {
              type: "number",
              name: "historyReturnMax",
              label: "History return max",
              description: "Max number of records to return",
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "historyReturnWindow",
              label: "History return window",
              description: "Max number of records to return",
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
