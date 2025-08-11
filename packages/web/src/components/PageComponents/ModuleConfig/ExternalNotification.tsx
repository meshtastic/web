import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type ExternalNotificationValidation,
  ExternalNotificationValidationSchema,
} from "@app/validation/moduleConfig/externalNotification.ts";
import { create } from "@bufbuild/protobuf";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { Protobuf } from "@meshtastic/core";
import { useTranslation } from "react-i18next";

interface ExternalNotificationModuleConfigProps {
  onFormInit: DynamicFormFormInit<ExternalNotificationValidation>;
}

export const ExternalNotification = ({
  onFormInit,
}: ExternalNotificationModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "externalNotification" });

  const {
    moduleConfig,
    setWorkingModuleConfig,
    getEffectiveModuleConfig,
    removeWorkingModuleConfig,
  } = useDevice();
  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: ExternalNotificationValidation) => {
    if (deepCompareConfig(moduleConfig.externalNotification, data, true)) {
      removeWorkingModuleConfig("externalNotification");
      return;
    }

    setWorkingModuleConfig(
      create(Protobuf.ModuleConfig.ModuleConfigSchema, {
        payloadVariant: {
          case: "externalNotification",
          value: data,
        },
      }),
    );
  };

  return (
    <DynamicForm<ExternalNotificationValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={ExternalNotificationValidationSchema}
      formId="ModuleConfig_ExternalNotificationConfig"
      defaultValues={moduleConfig.externalNotification}
      values={getEffectiveModuleConfig("externalNotification")}
      fieldGroups={[
        {
          label: t("externalNotification.title"),
          description: t("externalNotification.description"),
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("externalNotification.enabled.label"),
              description: t("externalNotification.enabled.description"),
            },
            {
              type: "number",
              name: "outputMs",
              label: t("externalNotification.outputMs.label"),
              description: t("externalNotification.outputMs.description"),

              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
              properties: {
                suffix: t("unit.millisecond.suffix"),
              },
            },
            {
              type: "number",
              name: "output",
              label: t("externalNotification.output.label"),
              description: t("externalNotification.output.description"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "outputVibra",
              label: t("externalNotification.outputVibra.label"),
              description: t("externalNotification.outputVibra.description"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "outputBuzzer",
              label: t("externalNotification.outputBuzzer.label"),
              description: t("externalNotification.outputBuzzer.description"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "active",
              label: t("externalNotification.active.label"),
              description: t("externalNotification.active.description"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "alertMessage",
              label: t("externalNotification.alertMessage.label"),
              description: t("externalNotification.alertMessage.description"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "alertMessageVibra",
              label: t("externalNotification.alertMessageVibra.label"),
              description: t(
                "externalNotification.alertMessageVibra.description",
              ),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "alertMessageBuzzer",
              label: t("externalNotification.alertMessageBuzzer.label"),
              description: t(
                "externalNotification.alertMessageBuzzer.description",
              ),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "alertBell",
              label: t("externalNotification.alertBell.label"),
              description: t("externalNotification.alertBell.description"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "alertBellVibra",
              label: t("externalNotification.alertBellVibra.label"),
              description: t("externalNotification.alertBellVibra.description"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "alertBellBuzzer",
              label: t("externalNotification.alertBellBuzzer.label"),
              description: t(
                "externalNotification.alertBellBuzzer.description",
              ),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "usePwm",
              label: t("externalNotification.usePwm.label"),
              description: t("externalNotification.usePwm.description"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "nagTimeout",
              label: t("externalNotification.nagTimeout.label"),
              description: t("externalNotification.nagTimeout.description"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "toggle",
              name: "useI2sAsBuzzer",
              label: t("externalNotification.useI2sAsBuzzer.label"),
              description: t("externalNotification.useI2sAsBuzzer.description"),
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
