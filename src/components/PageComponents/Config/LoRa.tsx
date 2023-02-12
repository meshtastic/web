import type { LoRaValidation } from "@app/validation/config/lora.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/meshtasticjs";
import { DynamicForm } from "@app/components/DynamicForm.js";

export const LoRa = (): JSX.Element => {
  const { config, setWorkingConfig } = useDevice();

  const onSubmit = (data: LoRaValidation) => {
    setWorkingConfig(
      new Protobuf.Config({
        payloadVariant: {
          case: "lora",
          value: data
        }
      })
    );
  };

  return (
    <DynamicForm<LoRaValidation>
      onSubmit={onSubmit}
      defaultValues={config.lora}
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
              enumValue: Protobuf.Config_LoRaConfig_RegionCode
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
              enumValue: Protobuf.Config_LoRaConfig_ModemPreset,
              formatEnumName: true,
              disabledBy: [
                {
                  fieldName: "usePreset"
                }
              ]
            },
            {
              type: "number",
              name: "bandwidth",
              label: "Bandwidth",
              description: "Channel bandwidth in MHz",
              suffix: "MHz",
              disabledBy: [
                {
                  fieldName: "usePreset",
                  invert: true
                }
              ]
            },
            {
              type: "number",
              name: "spreadFactor",
              label: "Spreading Factor",
              description: "Indicates the number of chirps per symbol",
              suffix: "CPS",
              disabledBy: [
                {
                  fieldName: "usePreset",
                  invert: true
                }
              ]
            },
            {
              type: "number",
              name: "codingRate",
              label: "Coding Rate",
              description: "The denominator of the coding rate",
              disabledBy: [
                {
                  fieldName: "usePreset",
                  invert: true
                }
              ]
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
              suffix: "dBm"
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
              suffix: "Hz"
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
              suffix: "Hz"
            }
          ]
        }
      ]}
    />
  );
};
