import type { DisplayValidation } from "@app/validation/config/display.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/meshtasticjs";
import { DynamicForm } from "@components/DynamicForm.js";

export const Display = (): JSX.Element => {
  const { config, setWorkingConfig } = useDevice();

  const onSubmit = (data: DisplayValidation) => {
    setWorkingConfig(
      new Protobuf.Config({
        payloadVariant: {
          case: "display",
          value: data
        }
      })
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
              suffix: "seconds"
            },
            {
              type: "select",
              name: "gpsFormat",
              label: "GPS Display Units",
              description: "Coordinate display format",
              enumValue: Protobuf.Config_DisplayConfig_GpsCoordinateFormat
            },
            {
              type: "number",
              name: "autoScreenCarouselSecs",
              label: "Carousel Delay",
              description: "How fast to cycle through windows"
            },
            {
              type: "toggle",
              name: "compassNorthTop",
              label: "Compass North Top",
              description: "Fix north to the top of compass"
            },
            {
              type: "toggle",
              name: "flipScreen",
              label: "Flip Screen",
              description: "Flip display 180 degrees"
            },
            {
              type: "select",
              name: "units",
              label: "Display Units",
              description: "Display metric or imperial units",
              enumValue: Protobuf.Config_DisplayConfig_DisplayUnits,
              formatEnumName: true
            },
            {
              type: "select",
              name: "oled",
              label: "OLED Type",
              description: "Type of OLED screen attached to the device",
              enumValue: Protobuf.Config_DisplayConfig_OledType
            },
            {
              type: "select",
              name: "displaymode",
              label: "Display Mode",
              description: "Screen layout variant",
              enumValue: Protobuf.Config_DisplayConfig_DisplayMode,
              formatEnumName: true
            },
            {
              type: "toggle",
              name: "headingBold",
              label: "Bold Heading",
              description: "Bolden the heading text"
            }
          ]
        }
      ]}
    />
  );
};
