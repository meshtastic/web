import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type ExternalNotificationValidation,
  ExternalNotificationValidationSchema,
} from "@app/validation/moduleConfig/externalNotification.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useRingtone, useSignal } from "@meshtastic/sdk-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStagedAdminString } from "./useStagedAdminString.ts";

interface ExternalNotificationModuleConfigProps {
  onFormInit: DynamicFormFormInit<ExternalNotificationValidation>;
}

const EMPTY_MODULES_SIGNAL = {
  value: {} as {
    externalNotification?: Protobuf.ModuleConfig.ModuleConfig_ExternalNotificationConfig;
  },
  peek: () =>
    ({}) as {
      externalNotification?: Protobuf.ModuleConfig.ModuleConfig_ExternalNotificationConfig;
    },
  subscribe: () => () => {},
} as const;

export const ExternalNotification = ({
  onFormInit,
}: ExternalNotificationModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "externalNotification" });

  const { moduleConfig, getEffectiveModuleConfig } = useDevice();
  const editor = useConfigEditor();
  const modules = useSignal(editor?.modules ?? EMPTY_MODULES_SIGNAL);
  const effective =
    modules.externalNotification ??
    (getEffectiveModuleConfig("externalNotification") as
      | Protobuf.ModuleConfig.ModuleConfig_ExternalNotificationConfig
      | undefined);

  const { t } = useTranslation("moduleConfig");

  // The ringtone isn't module config; it has its own admin get/set.
  const device = useRingtone();
  const ringtone = useStagedAdminString("ringtone", device.value);

  const defaultValues = useMemo(
    () =>
      ({
        ...moduleConfig.externalNotification,
        ringtone: device.value ?? "",
      }) as ExternalNotificationValidation,
    [moduleConfig.externalNotification, device.value],
  );
  const values = useMemo(
    () =>
      ({
        ...effective,
        ringtone: ringtone.value ?? "",
      }) as ExternalNotificationValidation,
    [effective, ringtone.value],
  );

  const onSubmit = (data: ExternalNotificationValidation) => {
    if (!editor) return;
    const { ringtone: rtttl, ...config } = data;
    editor.setModuleSection(
      "externalNotification",
      config as unknown as Protobuf.ModuleConfig.ModuleConfig_ExternalNotificationConfig,
    );
    ringtone.stage(rtttl);
  };

  const ringtoneDescription =
    device.value !== undefined
      ? t("externalNotification.ringtone.description")
      : device.isLoading
        ? t("externalNotification.ringtone.loading")
        : t("externalNotification.ringtone.unavailable");

  // Like Android, the active-high and PWM options only apply once their
  // pin is set.
  const hasOutput = (effective?.output ?? 0) !== 0;
  const hasBuzzer = (effective?.outputBuzzer ?? 0) !== 0;

  return (
    <DynamicForm<ExternalNotificationValidation>
      // Remount once the ringtone arrives so it becomes the form's default
      // value instead of showing up as an unsaved edit.
      key={device.value === undefined ? "loading" : "loaded"}
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={ExternalNotificationValidationSchema}
      defaultValues={defaultValues}
      values={values}
      fieldGroups={[
        {
          label: t("externalNotification.externalNotificationConfig.label"),
          description: t(
            "externalNotification.externalNotificationConfig.description",
          ),
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("externalNotification.enabled.label"),
              description: t("externalNotification.enabled.description"),
            },
          ],
        },
        {
          label: t("externalNotification.notificationsOnMessage.label"),
          description: t(
            "externalNotification.notificationsOnMessage.description",
          ),
          fields: [
            {
              type: "toggle",
              name: "alertMessage",
              label: t("externalNotification.alertMessage.label"),
              description: t("externalNotification.alertMessage.description"),
            },
            {
              type: "toggle",
              name: "alertMessageBuzzer",
              label: t("externalNotification.alertMessageBuzzer.label"),
              description: t(
                "externalNotification.alertMessageBuzzer.description",
              ),
            },
            {
              type: "toggle",
              name: "alertMessageVibra",
              label: t("externalNotification.alertMessageVibra.label"),
              description: t(
                "externalNotification.alertMessageVibra.description",
              ),
            },
          ],
        },
        {
          label: t("externalNotification.notificationsOnAlert.label"),
          description: t(
            "externalNotification.notificationsOnAlert.description",
          ),
          fields: [
            {
              type: "toggle",
              name: "alertBell",
              label: t("externalNotification.alertBell.label"),
              description: t("externalNotification.alertBell.description"),
            },
            {
              type: "toggle",
              name: "alertBellBuzzer",
              label: t("externalNotification.alertBellBuzzer.label"),
              description: t(
                "externalNotification.alertBellBuzzer.description",
              ),
            },
            {
              type: "toggle",
              name: "alertBellVibra",
              label: t("externalNotification.alertBellVibra.label"),
              description: t("externalNotification.alertBellVibra.description"),
            },
          ],
        },
        {
          label: t("externalNotification.advanced.label"),
          description: t("externalNotification.advanced.description"),
          fields: [
            {
              type: "number",
              name: "output",
              label: t("externalNotification.output.label"),
              description: t("externalNotification.output.description"),
            },
            ...(hasOutput
              ? [
                  {
                    type: "toggle" as const,
                    name: "active" as const,
                    label: t("externalNotification.active.label"),
                    description: t("externalNotification.active.description"),
                  },
                ]
              : []),
            {
              type: "number",
              name: "outputBuzzer",
              label: t("externalNotification.outputBuzzer.label"),
              description: t("externalNotification.outputBuzzer.description"),
            },
            ...(hasBuzzer
              ? [
                  {
                    type: "toggle" as const,
                    name: "usePwm" as const,
                    label: t("externalNotification.usePwm.label"),
                    description: t("externalNotification.usePwm.description"),
                  },
                ]
              : []),
            {
              type: "number",
              name: "outputVibra",
              label: t("externalNotification.outputVibra.label"),
              description: t("externalNotification.outputVibra.description"),
            },
            {
              type: "number",
              name: "outputMs",
              label: t("externalNotification.outputMs.label"),
              description: t("externalNotification.outputMs.description"),
              properties: { suffix: t("unit.millisecond.suffix") },
            },
            {
              type: "number",
              name: "nagTimeout",
              label: t("externalNotification.nagTimeout.label"),
              description: t("externalNotification.nagTimeout.description"),
              properties: { suffix: t("unit.second.plural") },
            },
            {
              type: "text",
              name: "ringtone",
              label: t("externalNotification.ringtone.label"),
              description: ringtoneDescription,
              disabled: device.value === undefined,
            },
            {
              type: "toggle",
              name: "useI2sAsBuzzer",
              label: t("externalNotification.useI2sAsBuzzer.label"),
              description: t("externalNotification.useI2sAsBuzzer.description"),
            },
          ],
        },
      ]}
    />
  );
};
