import type { ExternalNotificationValidation } from "@app/validation/moduleConfig/externalNotification.js";
import { useConfig, useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/meshtasticjs";
import { DynamicForm, EnableSwitchData } from "@components/Form/DynamicForm.js";
import type { ConfigPreset } from "@app/core/stores/appStore";

export const ExternalNotification = (): JSX.Element => {
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
  const setConfig: (data: ExternalNotificationValidation) => void =
    isPresetConfig ? (data) => {
      config.moduleConfig.externalNotification = new Protobuf.ModuleConfig_ExternalNotificationConfig(data);    
      (config as ConfigPreset).saveConfigTree();
    }
    : (data) => {
      useDevice().setWorkingModuleConfig(
        new Protobuf.ModuleConfig({
          payloadVariant: {
            case: "externalNotification",
            value: data
          }
        })
      );
    }
  
  const onSubmit = setConfig;

  return (
    <DynamicForm<ExternalNotificationValidation>
      onSubmit={onSubmit}
      defaultValues={config.moduleConfig.externalNotification}
      enableSwitch={enableSwitch}
      fieldGroups={[
        {
          label: "External Notification Settings",
          description: "Configure the external notification module",
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: "Module Enabled",
              description: "Enable External Notification"
            },
            {
              type: "number",
              name: "outputMs",
              label: "Output MS",
              description: "Output MS",

              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ],
              properties: {
                suffix: "ms"
              }
            },
            {
              type: "number",
              name: "output",
              label: "Output",
              description: "Output",
              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ]
            },
            {
              type: "number",
              name: "outputVibra",
              label: "Output Vibrate",
              description: "Output Vibrate",
              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ]
            },
            {
              type: "number",
              name: "outputBuzzer",
              label: "Output Buzzer",
              description: "Output Buzzer",
              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ]
            },
            {
              type: "toggle",
              name: "active",
              label: "Active",
              description: "Active",
              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ]
            },
            {
              type: "toggle",
              name: "alertMessage",
              label: "Alert Message",
              description: "Alert Message",
              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ]
            },
            {
              type: "toggle",
              name: "alertMessageVibra",
              label: "Alert Message Vibrate",
              description: "Alert Message Vibrate",
              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ]
            },
            {
              type: "toggle",
              name: "alertMessageBuzzer",
              label: "Alert Message Buzzer",
              description: "Alert Message Buzzer",
              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ]
            },
            {
              type: "toggle",
              name: "alertBell",
              label: "Alert Bell",
              description:
                "Should an alert be triggered when receiving an incoming bell?",
              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ]
            },
            {
              type: "toggle",
              name: "alertBellVibra",
              label: "Alert Bell Vibrate",
              description: "Alert Bell Vibrate",
              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ]
            },
            {
              type: "toggle",
              name: "alertBellBuzzer",
              label: "Alert Bell Buzzer",
              description: "Alert Bell Buzzer",
              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ]
            },
            {
              type: "toggle",
              name: "usePwm",
              label: "Use PWM",
              description: "Use PWM",
              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ]
            },
            {
              type: "number",
              name: "nagTimeout",
              label: "Nag Timeout",
              description: "Nag Timeout",
              disabledBy: [
                {
                  fieldName: "enabled"
                }
              ]
            }
          ]
        }
      ]}
    />
  );
};
