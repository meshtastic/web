import { useDevice } from "@app/core/stores/deviceStore.ts";
import type { AmbientLightingValidation } from "@app/validation/moduleConfig/ambientLighting.tsx";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useTranslation } from "react-i18next";
import { Protobuf } from "@meshtastic/js";

export const AmbientLighting = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();
  const { t } = useTranslation("translation");

  const onSubmit = (data: AmbientLightingValidation) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig.ModuleConfig({
        payloadVariant: {
          case: "ambientLighting",
          value: data,
        },
      })
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
              label: t("LED State"),
              description: t("Sets LED to on or off"),
            },
            {
              type: "number",
              name: "current",
              label: t("Current"),
              description: t(
                "Sets the current for the LED output. Default is 10"
              ),
            },
            {
              type: "number",
              name: "red",
              label: t("Red"),
              description: t("Sets the red LED level. Values are 0-255"),
            },
            {
              type: "number",
              name: "green",
              label: t("Green"),
              description: t("Sets the green LED level. Values are 0-255"),
            },
            {
              type: "number",
              name: "blue",
              label: t("Blue"),
              description: t("Sets the blue LED level. Values are 0-255"),
            },
          ],
        },
      ]}
    />
  );
};
