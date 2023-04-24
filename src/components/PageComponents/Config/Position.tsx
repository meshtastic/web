import type { ConfigPreset } from '@app/core/stores/appStore';
import type { PositionValidation } from '@app/validation/config/position.js';
import {
  DynamicForm,
  EnableSwitchData,
} from '@components/Form/DynamicForm.js';
import {
  useConfig,
  useDevice,
} from '@core/stores/deviceStore.js';
import { Protobuf } from '@meshtastic/meshtasticjs';

export const Position = (): JSX.Element => {
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
  const setConfig: (data: PositionValidation) => void =
    isPresetConfig ? (data) => {
      config.config.position = new Protobuf.Config_PositionConfig(data);    
      (config as ConfigPreset).saveConfigTree();
    }
    : (data) => {
      setWorkingConfig!(
        new Protobuf.Config({
          payloadVariant: {
            case: "position",
            value: data
          }
        })
      );
    }  

  const onSubmit = setConfig;  

  return (
    <DynamicForm<PositionValidation>
      onSubmit={onSubmit}
      defaultValues={config.config.position}
      enableSwitch={enableSwitch}
      fieldGroups={[
        {
          label: "Position settings",
          description: "Settings for the position module",
          fields: [
            {
              type: "toggle",
              name: "positionBroadcastSmartEnabled",
              label: "Enable Smart Position",
              description:
                "Only send position when there has been a meaningful change in location"
            },
            {
              type: "toggle",
              name: "fixedPosition",
              label: "Fixed Position",
              description:
                "Don't report GPS position, but a manually-specified one"
            },
            {
              type: "toggle",
              name: "gpsEnabled",
              label: "GPS Enabled",
              description: "Enable the internal GPS module"
            },
            {
              type: "multiSelect",
              name: "positionFlags",
              label: "Position Flags",
              description: "Configuration options for Position messages",
              properties: {
                enumValue: Protobuf.Config_PositionConfig_PositionFlags
              }
            },
            {
              type: "number",
              name: "rxGpio",
              label: "Receive Pin",
              description: "GPS Module RX pin override"
            },
            {
              type: "number",
              name: "txGpio",
              label: "Transmit Pin",
              description: "GPS Module TX pin override"
            }
          ]
        },
        {
          label: "Intervals",
          description: "How often to send position updates",
          fields: [
            {
              type: "number",
              name: "positionBroadcastSecs",
              label: "Broadcast Interval",
              description: "How often your position is sent out over the mesh"
            },
            {
              type: "number",
              name: "gpsUpdateInterval",
              label: "GPS Update Interval",
              description: "How often a GPS fix should be acquired"
            },
            {
              type: "number",
              name: "gpsAttemptTime",
              label: "Fix Attempt Duration",
              description: "How long the device will try to get a fix for"
            }
          ]
        }
      ]}
    />
  );
};
