import type { ConfigPreset } from '@app/core/stores/appStore';
import type { DisplayValidation } from '@app/validation/config/display.js';
import {
  DynamicForm,
  EnableSwitchData,
} from '@components/Form/DynamicForm.js';
import {
  useConfig,
  useDevice,
} from '@core/stores/deviceStore.js';
import { Protobuf } from '@meshtastic/meshtasticjs';

export const Display = (): JSX.Element => {
  const config = useConfig();
  const enableSwitch: EnableSwitchData | undefined = config.overrideValues ? {
    getEnabled(name) {
      return config.overrideValues![name] ?? false;
    },
    setEnabled(name, value) {
      config.overrideValues![name] = value;
    },
  } : undefined;
  const isPresetConfig = !("id" in config);
  const { setWorkingConfig } = !isPresetConfig ? useDevice() : { setWorkingConfig: undefined };
  const setConfig: (data: DisplayValidation) => void =
    isPresetConfig ? (data) => {
      config.config.display = new Protobuf.Config_DisplayConfig(data);
      (config as ConfigPreset).saveConfigTree();
    }
    : (data) => {
      setWorkingConfig!(
        new Protobuf.Config({
          payloadVariant: {
            case: "display",
            value: data
          }
        })
      );
    }

  const onSubmit = setConfig;

  return (
    <DynamicForm<DisplayValidation>
      onSubmit={onSubmit}
      defaultValues={config.config.display}
      enableSwitch={enableSwitch}
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
                suffix: "seconds"
              }
            },
            {
              type: "select",
              name: "gpsFormat",
              label: "GPS Display Units",
              description: "Coordinate display format",
              properties: {
                enumValue: Protobuf.Config_DisplayConfig_GpsCoordinateFormat
              }
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
              properties: {
                enumValue: Protobuf.Config_DisplayConfig_DisplayUnits,
                formatEnumName: true
              }
            },
            {
              type: "select",
              name: "oled",
              label: "OLED Type",
              description: "Type of OLED screen attached to the device",
              properties: {
                enumValue: Protobuf.Config_DisplayConfig_OledType
              }
            },
            {
              type: "select",
              name: "displaymode",
              label: "Display Mode",
              description: "Screen layout variant",
              properties: {
                enumValue: Protobuf.Config_DisplayConfig_DisplayMode,
                formatEnumName: true
              }
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
