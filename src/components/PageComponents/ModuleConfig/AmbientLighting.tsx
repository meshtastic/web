import { useDevice } from "@core/stores/deviceStore.ts";
import type { AmbientLightingValidation } from "@app/validation/moduleConfig/ambientLighting.tsx";
import { create } from "@bufbuild/protobuf";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { Protobuf } from "@meshtastic/core";

export const AmbientLighting = () => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();

  const onSubmit = (data: AmbientLightingValidation) => {
    setWorkingModuleConfig(
      create(Protobuf.ModuleConfig.ModuleConfigSchema, {
        payloadVariant: {
          case: "ambientLighting",
          value: data,
        },
      }),
    );
  };

  return (
    <DynamicForm<AmbientLightingValidation>
      onSubmit={onSubmit}
      defaultValues={moduleConfig.ambientLighting}
      fieldGroups={[
        {
          label: "Ambient Lighting Settings",
          description: "Settings for the Ambient Lighting module",
          fields: [
            {
              type: "toggle",
              name: "ledState",
              label: "LED State",
              description: "Sets LED to on or off",
            },
            {
              type: "number",
              name: "current",
              label: "Current",
              description: "Sets the current for the LED output. Default is 10",
            },
            {
              type: "number",
              name: "red",
              label: "Red",
              description: "Sets the red LED level. Values are 0-255",
            },
            {
              type: "number",
              name: "green",
              label: "Green",
              description: "Sets the green LED level. Values are 0-255",
            },
            {
              type: "number",
              name: "blue",
              label: "Blue",
              description: "Sets the blue LED level. Values are 0-255",
            },
          ],
        },
      ]}
    />
  );
};
