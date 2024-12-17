import type { LoRaValidation } from "@app/validation/config/lora.tsx";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { useTranslation } from "react-i18next";
import { Protobuf } from "@meshtastic/js";

export const LoRa = (): JSX.Element => {
  const { config, setWorkingConfig } = useDevice();
  const { t } = useTranslation();

  const onSubmit = (data: LoRaValidation) => {
    setWorkingConfig(
      new Protobuf.Config.Config({
        payloadVariant: {
          case: "lora",
          value: data,
        },
      })
    );
  };

  return (
    <DynamicForm<LoRaValidation>
      onSubmit={onSubmit}
      defaultValues={config.lora}
      fieldGroups={[
        {
          label: t("Mesh Settings"),
          description: t("Settings for the LoRa mesh"),
          fields: [
            {
              type: "select",
              name: "region",
              label: t("Region"),
              description: t("Sets the region for your node"),
              properties: {
                enumValue: Protobuf.Config.Config_LoRaConfig_RegionCode,
              },
            },
            {
              type: "select",
              name: "hopLimit",
              label: t("Hop Limit"),
              description: t("Maximum number of hops"),
              properties: {
                enumValue: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 },
              },
            },
            {
              type: "number",
              name: "channelNum",
              label: t("Frequency Slot"),
              description: t("LoRa frequency channel number"),
            },
            {
              type: "toggle",
              name: "ignoreMqtt",
              label: t("Ignore MQTT"),
              description: t("Don't forward MQTT messages over the mesh"),
            },
            {
              type: "toggle",
              name: "configOkToMqtt",
              label: t("OK to MQTT"),
              description: t("OK to MQTT description"),
            },
          ],
        },
        {
          label: t("Waveform Settings"),
          description: t("Settings for the LoRa waveform"),
          fields: [
            {
              type: "toggle",
              name: "usePreset",
              label: t("Use Preset"),
              description: t("Use one of the predefined modem presets"),
            },
            {
              type: "select",
              name: "modemPreset",
              label:t( "Modem Preset"),
              description:t( "Modem preset to use"),
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
              label: t("Bandwidth"),
              description:t( "Channel bandwidth in MHz"),
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
              label: t("Spreading Factor"),
              description: ("Indicates the number of chirps per symbol"),

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
              label: t("Coding Rate"),
              description: t("The denominator of the coding rate"),
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
          label: t("Radio Settings"),
          description: t("Settings for the LoRa radio"),
          fields: [
            {
              type: "toggle",
              name: "txEnabled",
              label:t( "Transmit Enabled"),
              description: t("Enable/Disable transmit (TX) from the LoRa radio"),
            },
            {
              type: "number",
              name: "txPower",
              label: t("Transmit Power"),
              description: t("Max transmit power"),
              properties: {
                suffix: "dBm",
              },
            },
            {
              type: "toggle",
              name: "overrideDutyCycle",
              label: t("Override Duty Cycle"),
              description: t("Override Duty Cycle"),
            },
            {
              type: "number",
              name: "frequencyOffset",
              label: t("Frequency Offset"),
              description:
                t("Frequency offset to correct for crystal calibration errors"),
              properties: {
                suffix: "Hz",
              },
            },
            {
              type: "toggle",
              name: "sx126xRxBoostedGain",
              label: t("Boosted RX Gain"),
              description: t("Boosted RX gain"),
            },
            {
              type: "number",
              name: "overrideFrequency",
              label: t("Override Frequency"),
              description: t("Override frequency"),
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
