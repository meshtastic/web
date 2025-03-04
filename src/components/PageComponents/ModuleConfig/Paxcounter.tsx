import type { PaxcounterValidation } from "@app/validation/moduleConfig/paxcounter.tsx";
import { create } from "@bufbuild/protobuf";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/core";

export const Paxcounter = () => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();

  const onSubmit = (data: PaxcounterValidation) => {
    setWorkingModuleConfig(
      create(Protobuf.ModuleConfig.ModuleConfigSchema, {
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
              description:
                "How long to wait between sending paxcounter packets",
              properties: {
                suffix: "Seconds",
              },
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
