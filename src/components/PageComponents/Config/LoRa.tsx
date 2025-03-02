import type { LoRaValidation } from "@app/validation/config/lora.tsx";
import { create } from "@bufbuild/protobuf";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/core";

export const LoRa = () => {
  const { config, setWorkingConfig } = useDevice();

  const onSubmit = (data: LoRaValidation) => {
    setWorkingConfig(
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: "lora",
          value: data,
        },
      }),
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
              properties: {
                enumValue: Protobuf.Config.Config_LoRaConfig_RegionCode,
              },
            },
            {
              type: "select",
              name: "hopLimit",
              label: "Hop Limit",
              description: "Maximum number of hops",
              properties: {
                enumValue: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 },
              },
            },
            {
              type: "number",
              name: "channelNum",
              label: "Frequency Slot",
              description: "LoRa frequency channel number",
            },
            {
              type: "toggle",
              name: "ignoreMqtt",
              label: "Ignore MQTT",
              description: "Don't forward MQTT messages over the mesh",
            },
            {
              type: "toggle",
              name: "configOkToMqtt",
              label: "OK to MQTT",
              description:
                "When set to true, this configuration indicates that the user approves the packet to be uploaded to MQTT. If set to false, remote nodes are requested not to forward packets to MQTT",
            },
          ],
        },
        {
          label: "Waveform Settings",
          description: "Settings for the LoRa waveform",
          fields: [
            {
              type: "toggle",
              name: "usePreset",
              label: "Use Preset",
              description: "Use one of the predefined modem presets",
            },
            {
              type: "select",
              name: "modemPreset",
              label: "Modem Preset",
              description: "Modem preset to use",
              disabledBy: [
                {
                  fieldName: "usePreset",
                },
              ],
              properties: {
                enumValue: Protobuf.Config.Config_LoRaConfig_ModemPreset,
                formatEnumName: true,
              },
            },
            {
              type: "number",
              name: "bandwidth",
              label: "Bandwidth",
              description: "Channel bandwidth in MHz",
              disabledBy: [
                {
                  fieldName: "usePreset",
                  invert: true,
                },
              ],
              properties: {
                suffix: "MHz",
              },
            },
            {
              type: "number",
              name: "spreadFactor",
              label: "Spreading Factor",
              description: "Indicates the number of chirps per symbol",

              disabledBy: [
                {
                  fieldName: "usePreset",
                  invert: true,
                },
              ],
              properties: {
                suffix: "CPS",
              },
            },
            {
              type: "number",
              name: "codingRate",
              label: "Coding Rate",
              description: "The denominator of the coding rate",
              disabledBy: [
                {
                  fieldName: "usePreset",
                  invert: true,
                },
              ],
            },
          ],
        },
        {
          label: "Radio Settings",
          description: "Settings for the LoRa radio",
          fields: [
            {
              type: "toggle",
              name: "txEnabled",
              label: "Transmit Enabled",
              description: "Enable/Disable transmit (TX) from the LoRa radio",
            },
            {
              type: "number",
              name: "txPower",
              label: "Transmit Power",
              description: "Max transmit power",
              properties: {
                suffix: "dBm",
              },
            },
            {
              type: "toggle",
              name: "overrideDutyCycle",
              label: "Override Duty Cycle",
              description: "Override Duty Cycle",
            },
            {
              type: "number",
              name: "frequencyOffset",
              label: "Frequency Offset",
              description:
                "Frequency offset to correct for crystal calibration errors",
              properties: {
                suffix: "Hz",
              },
            },
            {
              type: "toggle",
              name: "sx126xRxBoostedGain",
              label: "Boosted RX Gain",
              description: "Boosted RX gain",
            },
            {
              type: "number",
              name: "overrideFrequency",
              label: "Override Frequency",
              description: "Override frequency",
              properties: {
                suffix: "MHz",
                step: 0.001,
              },
            },
          ],
        },
      ]}
    />
  );
};
