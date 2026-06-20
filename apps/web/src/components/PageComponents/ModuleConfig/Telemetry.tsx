import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type TelemetryValidation,
  TelemetryValidationSchema,
} from "@app/validation/moduleConfig/telemetry.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useTranslation } from "react-i18next";

interface TelemetryModuleConfigProps {
  onFormInit: DynamicFormFormInit<TelemetryValidation>;
}

const EMPTY_MODULES_SIGNAL = {
  value: {} as {
    telemetry?: Protobuf.ModuleConfig.ModuleConfig_TelemetryConfig;
  },
  peek: () =>
    ({}) as { telemetry?: Protobuf.ModuleConfig.ModuleConfig_TelemetryConfig },
  subscribe: () => () => {},
} as const;

/**
 * Compare a Meshtastic firmware version string ("X.Y.Z" or "X.Y.Z.suffix")
 * against a (major, minor, patch) tuple. Returns true if the running
 * firmware is at least that version. Unknown / unparseable versions return
 * `true` to avoid hiding the toggle from devices we can't classify.
 */
function firmwareAtLeast(
  version: string | undefined,
  major: number,
  minor: number,
  patch: number,
): boolean {
  if (!version) return true;
  const parts = version.split(/[.\-+]/).map((s) => Number.parseInt(s, 10));
  const [maj = 0, min = 0, pat = 0] = parts;
  if (Number.isNaN(maj) || Number.isNaN(min) || Number.isNaN(pat)) return true;
  if (maj !== major) return maj > major;
  if (min !== minor) return min > minor;
  return pat >= patch;
}

export const Telemetry = ({ onFormInit }: TelemetryModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "telemetry" });

  const { moduleConfig, metadata, getEffectiveModuleConfig } = useDevice();
  const editor = useConfigEditor();
  const modules = useSignal(editor?.modules ?? EMPTY_MODULES_SIGNAL);
  const effective =
    modules.telemetry ??
    (getEffectiveModuleConfig("telemetry") as
      | Protobuf.ModuleConfig.ModuleConfig_TelemetryConfig
      | undefined);

  // Mirrors the Android `Capabilities.canToggleTelemetryEnabled` gate:
  // device_telemetry_enabled is only writable on firmware ≥ v2.7.12. Hide
  // the toggle on older firmware so we don't push a value the device will
  // ignore.
  const canToggleTelemetry = firmwareAtLeast(
    metadata.get(0)?.firmwareVersion,
    2,
    7,
    12,
  );

  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: TelemetryValidation) => {
    if (!editor) return;
    editor.setModuleSection(
      "telemetry",
      data as unknown as Protobuf.ModuleConfig.ModuleConfig_TelemetryConfig,
    );
  };

  return (
    <DynamicForm<TelemetryValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={TelemetryValidationSchema}
      defaultValues={moduleConfig.telemetry}
      values={effective}
      fieldGroups={[
        {
          label: t("telemetry.telemetryConfig.label"),
          description: t("telemetry.telemetryConfig.description"),
          fields: [
            ...(canToggleTelemetry
              ? [
                  {
                    type: "toggle" as const,
                    name: "deviceTelemetryEnabled" as const,
                    label: t("telemetry.deviceTelemetryEnabled.label"),
                    description: t(
                      "telemetry.deviceTelemetryEnabled.description",
                    ),
                  },
                ]
              : []),
            {
              type: "number",
              name: "deviceUpdateInterval",
              label: t("telemetry.deviceUpdateInterval.label"),
              description: t("telemetry.deviceUpdateInterval.description"),
              properties: { suffix: t("unit.second.plural") },
            },
            {
              type: "toggle",
              name: "environmentMeasurementEnabled",
              label: t("telemetry.environmentMeasurementEnabled.label"),
              description: t(
                "telemetry.environmentMeasurementEnabled.description",
              ),
            },
            {
              type: "number",
              name: "environmentUpdateInterval",
              label: t("telemetry.environmentUpdateInterval.label"),
              description: t("telemetry.environmentUpdateInterval.description"),
              properties: { suffix: t("unit.second.plural") },
            },
            {
              type: "toggle",
              name: "environmentScreenEnabled",
              label: t("telemetry.environmentScreenEnabled.label"),
              description: t("telemetry.environmentScreenEnabled.description"),
            },
            {
              type: "toggle",
              name: "environmentDisplayFahrenheit",
              label: t("telemetry.environmentDisplayFahrenheit.label"),
              description: t(
                "telemetry.environmentDisplayFahrenheit.description",
              ),
            },
            {
              type: "toggle",
              name: "airQualityEnabled",
              label: t("telemetry.airQualityEnabled.label"),
              description: t("telemetry.airQualityEnabled.description"),
            },
            {
              type: "number",
              name: "airQualityInterval",
              label: t("telemetry.airQualityInterval.label"),
              description: t("telemetry.airQualityInterval.description"),
              properties: { suffix: t("unit.second.plural") },
            },
            {
              type: "toggle",
              name: "airQualityScreenEnabled",
              label: t("telemetry.airQualityScreenEnabled.label"),
              description: t("telemetry.airQualityScreenEnabled.description"),
            },
            {
              type: "toggle",
              name: "powerMeasurementEnabled",
              label: t("telemetry.powerMeasurementEnabled.label"),
              description: t("telemetry.powerMeasurementEnabled.description"),
            },
            {
              type: "number",
              name: "powerUpdateInterval",
              label: t("telemetry.powerUpdateInterval.label"),
              description: t("telemetry.powerUpdateInterval.description"),
              properties: { suffix: t("unit.second.plural") },
            },
            {
              type: "toggle",
              name: "powerScreenEnabled",
              label: t("telemetry.powerScreenEnabled.label"),
              description: t("telemetry.powerScreenEnabled.description"),
            },
          ],
        },
      ]}
    />
  );
};
