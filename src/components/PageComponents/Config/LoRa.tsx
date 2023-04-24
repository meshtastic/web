import type { ConfigPreset } from '@app/core/stores/appStore';
import type { LoRaValidation } from '@app/validation/config/lora.js';
import {
  DynamicForm,
  EnableSwitchData,
} from '@components/Form/DynamicForm.js';
import {
  useConfig,
  useDevice,
} from '@core/stores/deviceStore.js';
import { Protobuf } from '@meshtastic/meshtasticjs';

export const LoRa = (): JSX.Element => {
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
  const setConfig: (data: LoRaValidation) => void =
    isPresetConfig ? (data) => {
      config.config.lora = new Protobuf.Config_LoRaConfig(data);    
      (config as ConfigPreset).saveConfigTree();
    }
    : (data) => {
      setWorkingConfig!(
        new Protobuf.Config({
          payloadVariant: {
            case: "lora",
            value: data
          }
        })
      );
    }  

  const onSubmit = setConfig;  

  return (
    <DynamicForm<LoRaValidation>
      onSubmit={onSubmit}
      defaultValues={config.config.lora}
      enableSwitch={enableSwitch}
      fieldGroups={[
        {
          label: "Mesh Settings",
          description: "Settings for the LoRa mesh",
          fields: [
            {
              type: "select",
              name: "region",
              label: "Region",
              description: "Sets the region for your node",
              properties: {
                enumValue: Protobuf.Config_LoRaConfig_RegionCode
              }
            },
            {
              type: "number",
              name: "hopLimit",
              label: "Hop Limit",
              description: "Maximum number of hops"
            },
            {
              type: "number",
              name: "channelNum",
              label: "Channel Number",
              description: "LoRa channel number"
            }
          ]
        },
        {
          label: "Waveform Settings",
          description: "Settings for the LoRa waveform",
          fields: [
            {
              type: "toggle",
              name: "usePreset",
              label: "Use Preset",
              description: "Use one of the predefined modem presets"
            },
            {
              type: "select",
              name: "modemPreset",
              label: "Modem Preset",
              description: "Modem preset to use",
              properties: {
                enumValue: Protobuf.Config_LoRaConfig_ModemPreset,
                formatEnumName: true
              }
            },
            {
              type: "number",
              name: "bandwidth",
              label: "Bandwidth",
              description: "Channel bandwidth in MHz",
              properties: {
                suffix: "MHz"
              }
            },
            {
              type: "number",
              name: "spreadFactor",
              label: "Spreading Factor",
              description: "Indicates the number of chirps per symbol",

              properties: {
                suffix: "CPS"
              }
            },
            {
              type: "number",
              name: "codingRate",
              label: "Coding Rate",
              description: "The denominator of the coding rate",
            }
          ]
        },
        {
          label: "Radio Settings",
          description: "Settings for the LoRa radio",
          fields: [
            {
              type: "toggle",
              name: "txEnabled",
              label: "Tramsmit Enabled",
              description: "Enable/Disable transmit (TX) from the LoRa radio"
            },
            {
              type: "number",
              name: "txPower",
              label: "Transmit Power",
              description: "Max transmit power",
              properties: {
                suffix: "dBm"
              }
            },
            {
              type: "toggle",
              name: "overrideDutyCycle",
              label: "Override Duty Cycle",
              description: "Override Duty Cycle"
            },
            {
              type: "number",
              name: "frequencyOffset",
              label: "Frequency Offset",
              description:
                "Frequency offset to correct for crystal calibration errors",
              properties: {
                suffix: "Hz"
              }
            },
            {
              type: "toggle",
              name: "sx126xRxBoostedGain",
              label: "Boosted RX Gain",
              description: "Boosted RX gain"
            },
            {
              type: "number",
              name: "overrideFrequency",
              label: "Override Frequency",
              description: "Override frequency",
              properties: {
                suffix: "Hz"
              }
            }
          ]
        }
      ]}
    />
  );
};
