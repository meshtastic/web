import type { ConfigPreset } from '@app/core/stores/appStore';
import type { DeviceValidation } from '@app/validation/config/device.js';
import {
  DynamicForm,
  EnableSwitchData,
} from '@components/Form/DynamicForm.js';
import { useConfig } from '@core/stores/deviceStore.js';
import { Protobuf } from '@meshtastic/meshtasticjs';

export const Device = (): JSX.Element => {
  //const { config, setWorkingConfig } = useDevice();
  const config = useConfig();
  const enableSwitch: EnableSwitchData | undefined = config.overrideValues ? {
    getEnabled(name) {
      return config.overrideValues![name] ?? false;
    },
    setEnabled(name, value) {
      config.overrideValues![name] = value;      
    },
  } : undefined;
  const isPresetConfig = !("id" in config);   // Kinda hacky...

  const onSubmit = (data: DeviceValidation) => {
    if(isPresetConfig) {      
      config.config.device = new Protobuf.Config_DeviceConfig(data);    
      (config as ConfigPreset).saveConfigTree();
    }
    // setWorkingConfig(
    //   new Protobuf.Config({
    //     payloadVariant: {
    //       case: "device",
    //       value: data
    //     }
    //   })
    // );
  };

  return (
    <DynamicForm<DeviceValidation>
      onSubmit={onSubmit}
      submitType={isPresetConfig ? "onChange" : "onSubmit"}
      defaultValues={config.config.device}
      enableSwitch={enableSwitch}
      fieldGroups={[
        {
          label: "Device Settings",
          description: "Settings for the device",
          fields: [
            {
              type: "select",
              name: "role",
              label: "Role",
              description: "What role the device performs on the mesh",
              properties: {
                enumValue: Protobuf.Config_DeviceConfig_Role,
                formatEnumName: true
              }
            },
            {
              type: "toggle",
              name: "serialEnabled",
              label: "Serial Output Enabled",
              description: "Enable the device's serial console"
            },
            {
              type: "toggle",
              name: "debugLogEnabled",
              label: "Enabled Debug Log",
              description:
                "Output debugging information to the device's serial port (auto disables when serial client is connected)"
            },
            {
              type: "number",
              name: "buttonGpio",
              label: "Button Pin",
              description: "Button pin override"
            },
            {
              type: "number",
              name: "buzzerGpio",
              label: "Buzzer Pin",
              description: "Buzzer pin override"
            },
            {
              type: "select",
              name: "rebroadcastMode",
              label: "Rebroadcast Mode",
              description: "How to handle rebroadcasting",
              properties: {
                enumValue: Protobuf.Config_DeviceConfig_RebroadcastMode,
                formatEnumName: true
              }
            },
            {
              type: "number",
              name: "nodeInfoBroadcastSecs",
              label: "Node Info Broadcast Interval",
              description: "How often to broadcast node info",
              properties: {
                suffix: "Seconds"
              }
            }
          ]
        }
      ]}
    />
  );
};
