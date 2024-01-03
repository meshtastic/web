import { useDevice } from "@app/core/stores/deviceStore.js";
import type { AmbientLightingValidation } from "@app/validation/moduleConfig/ambientLighting.js";
import { DynamicForm } from "@components/Form/DynamicForm.js";
import { Protobuf } from "@meshtastic/js";

export const AmbientLighting = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();

  const onSubmit = (data: AmbientLightingValidation) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig.ModuleConfig({
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
