import type { ExternalNotificationValidation } from "@app/validation/moduleConfig/externalNotification.tsx";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { useTranslation } from "react-i18next";
import { Protobuf } from "@meshtastic/js";

export const ExternalNotification = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();
  const { t } = useTranslation();

  const onSubmit = (data: ExternalNotificationValidation) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig.ModuleConfig({
        payloadVariant: {
          case: "externalNotification",
          value: data,
        },
      })
    );
  };

  return (
    <DynamicForm<ExternalNotificationValidation>
      onSubmit={onSubmit}
      defaultValues={moduleConfig.externalNotification}
      fieldGroups={[
        {
          label: t("External Notification Settings"),
          description: "Configure the external notification module",
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("Module Enabled"),
              description: t("Enable External Notification"),
            },
            {
              type: "number",
              name: "outputMs",
              label: t("Output MS"),
              description: t("Output MS"),

              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
              properties: {
                suffix: "ms",
              },
            },
            {
              type: "number",
              name: "output",
              label: t("Output"),
              description: t("Output"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "outputVibra",
              label: t("Output Vibrate"),
              description: t("Output Vibrate"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "outputBuzzer",
              label: t("Output Buzzer"),
              description: t("Output Buzzer"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "active",
              label: t("Active"),
              description: t("Active"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "alertMessage",
              label: t("Alert Message"),
              description: t("Alert Message"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "alertMessageVibra",
              label: t("Alert Message Vibrate"),
              description: t("Alert Message Vibrate"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "alertMessageBuzzer",
              label: t("Alert Message Buzzer"),
              description: t("Alert Message Buzzer"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "alertBell",
              label: t("Alert Bell"),
              description: t(
                "Should an alert be triggered when receiving an incoming bell?"
              ),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "alertBellVibra",
              label: t("Alert Bell Vibrate"),
              description: t("Alert Bell Vibrate"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "alertBellBuzzer",
              label: t("Alert Bell Buzzer"),
              description: t("Alert Bell Buzzer"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "usePwm",
              label: t("Use PWM"),
              description: t("Use PWM"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "nagTimeout",
              label: t("Nag Timeout"),
              description: t("Nag Timeout"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "useI2sAsBuzzer",
              label: t("Use I²S Pin as Buzzer"),
              description: t("Designate I²S Pin as Buzzer Output"),
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
