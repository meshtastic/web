import type { DisplayValidation } from "@app/validation/config/display.tsx";
import { create } from "@bufbuild/protobuf";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/core";

export const Display = () => {
  const { config, setWorkingConfig } = useDevice();

  const onSubmit = (data: DisplayValidation) => {
    setWorkingConfig(
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: "display",
          value: data,
        },
      }),
    );
  };

  return (
    <DynamicForm<DisplayValidation>
      onSubmit={onSubmit}
      defaultValues={config.display}
      fieldGroups={[
        {
          label: "Display Settings",
          description: "Settings for the device display",
          fields: [
            {
              type: "number",
              name: "screenOnSecs",
              label: "Screen Timeout",
              description: "Turn off the display after this long",
              properties: {
                suffix: "Seconds",
              },
            },
            {
              type: "select",
              name: "gpsFormat",
              label: "GPS Display Units",
              description: "Coordinate display format",
              properties: {
                enumValue:
                  Protobuf.Config.Config_DisplayConfig_GpsCoordinateFormat,
              },
            },
            {
              type: "number",
              name: "autoScreenCarouselSecs",
              label: "Carousel Delay",
              description: "How fast to cycle through windows",
              properties: {
                suffix: "Seconds",
              },
            },
            {
              type: "toggle",
              name: "compassNorthTop",
              label: "Compass North Top",
              description: "Fix north to the top of compass",
            },
            {
              type: "toggle",
              name: "use12hClock",
              label: "12-Hour Clock",
              description: "Use 12-hour clock format",
            },
            {
              type: "toggle",
              name: "flipScreen",
              label: "Flip Screen",
              description: "Flip display 180 degrees",
            },
            {
              type: "select",
              name: "units",
              label: "Display Units",
              description: "Display metric or imperial units",
              properties: {
                enumValue: Protobuf.Config.Config_DisplayConfig_DisplayUnits,
                formatEnumName: true,
              },
            },
            {
              type: "select",
              name: "oled",
              label: "OLED Type",
              description: "Type of OLED screen attached to the device",
              properties: {
                enumValue: Protobuf.Config.Config_DisplayConfig_OledType,
              },
            },
            {
              type: "select",
              name: "displaymode",
              label: "Display Mode",
              description: "Screen layout variant",
              properties: {
                enumValue: Protobuf.Config.Config_DisplayConfig_DisplayMode,
                formatEnumName: true,
              },
            },
            {
              type: "toggle",
              name: "headingBold",
              label: "Bold Heading",
              description: "Bolden the heading text",
            },
            {
              type: "toggle",
              name: "wakeOnTapOrMotion",
              label: "Wake on Tap or Motion",
              description: "Wake the device on tap or motion",
            },
          ],
        },
      ]}
    />
  );
};
