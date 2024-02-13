import type { PaxcounterValidation } from "@app/validation/moduleConfig/paxcounter.js";
import { DynamicForm } from "@components/Form/DynamicForm.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/js";

export const Paxcounter = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();

  const onSubmit = (data: PaxcounterValidation) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig.ModuleConfig({
        payloadVariant: {
          case: "paxcounter",
          value: data,
        },
      }),
    );
  };

  return (
    <DynamicForm<PaxcounterValidation>
      onSubmit={onSubmit}
      defaultValues={moduleConfig.paxcounter}
      fieldGroups={[
        {
          label: "Paxcounter Settings",
          description: "Settings for the Paxcounter module",
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: "Module Enabled",
              description: "Enable Paxcounter",
            },
            {
              type: "number",
              name: "paxcounterUpdateInterval",
              label: "Update Interval (seconds)",
              description: "How long to wait between sending paxcounter packets",
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
