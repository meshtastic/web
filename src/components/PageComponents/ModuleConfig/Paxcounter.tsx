import type { PaxcounterValidation } from "@app/validation/moduleConfig/paxcounter.ts";
import { create } from "@bufbuild/protobuf";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/core";

export const Paxcounter = () => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();

  const onSubmit = (data: PaxcounterValidation) => {
    setWorkingModuleConfig(
      create(Protobuf.ModuleConfig.ModuleConfigSchema, {
        payloadVariant: {
          case: "paxcounter",
          value: data,
        },
      }),
    );
  };

  return (
    <DynamicForm<PaxcounterValidation>
      onSubmit={onSubmit}
      defaultValues={moduleConfig.paxcounter}
      fieldGroups={[
        {
          label: "Paxcounter Settings",
          description: "Settings for the Paxcounter module",
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: "Module Enabled",
              description: "Enable Paxcounter",
            },
            {
              type: "number",
              name: "paxcounterUpdateInterval",
              label: "Update Interval (seconds)",
              description:
                "How long to wait between sending paxcounter packets",
              properties: {
                suffix: "Seconds",
              },
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "wifiThreshold",
              label: "WiFi RSSI Threshold",
              description:
                "At what WiFi RSSI level should the counter increase. Defaults to -80.",
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "bleThreshold",
              label: "BLE RSSI Threshold",
              description:
                "At what BLE RSSI level should the counter increase. Defaults to -80.",
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
          ],
        },
      ]}
    />
  );
};
