import { useDevice } from "@app/core/stores/deviceStore.js";
import type { NeighborInfoValidation } from "@app/validation/moduleConfig/neighborInfo.js";
import { DynamicForm } from "@components/Form/DynamicForm.js";
import { Protobuf } from "@meshtastic/js";

export const NeighborInfo = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();

  const onSubmit = (data: NeighborInfoValidation) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig.ModuleConfig({
        payloadVariant: {
          case: "neighborInfo",
          value: data,
        },
      }),
    );
  };

  return (
    <DynamicForm<NeighborInfoValidation>
      onSubmit={onSubmit}
      defaultValues={moduleConfig.neighborInfo}
      fieldGroups={[
        {
          label: "Neighbor Info Settings",
          description: "Settings for the Neighbor Info module",
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: "Enabled",
              description: "Enable or disable Neighbor Info Module",
            },
            {
              type: "number",
              name: "updateInterval",
              label: "Update Interval",
              description:
                "Interval in seconds of how often we should try to send our Neighbor Info to the mesh",
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
