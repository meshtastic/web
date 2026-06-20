import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type TrafficManagementValidation,
  TrafficManagementValidationSchema,
} from "@app/validation/moduleConfig/trafficManagement.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { useTranslation } from "react-i18next";

interface TrafficManagementModuleConfigProps {
  onFormInit: DynamicFormFormInit<TrafficManagementValidation>;
}

export const TrafficManagement = ({
  onFormInit,
}: TrafficManagementModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "trafficManagement" });

  const { moduleConfig, setChange, getEffectiveModuleConfig, removeChange } =
    useDevice();
  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: TrafficManagementValidation) => {
    if (deepCompareConfig(moduleConfig.trafficManagement, data, true)) {
      removeChange({ type: "moduleConfig", variant: "trafficManagement" });
      return;
    }

    setChange(
      { type: "moduleConfig", variant: "trafficManagement" },
      data,
      moduleConfig.trafficManagement,
    );
  };

  return (
    <DynamicForm<TrafficManagementValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={TrafficManagementValidationSchema}
      defaultValues={moduleConfig.trafficManagement}
      values={getEffectiveModuleConfig("trafficManagement")}
      fieldGroups={[
        {
          label: t("trafficManagement.title"),
          description: t("trafficManagement.description"),
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("trafficManagement.enabled.label"),
              description: t("trafficManagement.enabled.description"),
            },
            {
              type: "toggle",
              name: "positionDedupEnabled",
              label: t("trafficManagement.positionDedupEnabled.label"),
              description: t(
                "trafficManagement.positionDedupEnabled.description",
              ),
            },
            {
              type: "number",
              name: "positionPrecisionBits",
              label: t("trafficManagement.positionPrecisionBits.label"),
              description: t(
                "trafficManagement.positionPrecisionBits.description",
              ),
            },
            {
              type: "number",
              name: "positionMinIntervalSecs",
              label: t("trafficManagement.positionMinIntervalSecs.label"),
              description: t(
                "trafficManagement.positionMinIntervalSecs.description",
              ),
              properties: {
                suffix: t("unit.second.plural"),
              },
            },
            {
              type: "toggle",
              name: "nodeinfoDirectResponse",
              label: t("trafficManagement.nodeinfoDirectResponse.label"),
              description: t(
                "trafficManagement.nodeinfoDirectResponse.description",
              ),
            },
            {
              type: "number",
              name: "nodeinfoDirectResponseMaxHops",
              label: t("trafficManagement.nodeinfoDirectResponseMaxHops.label"),
              description: t(
                "trafficManagement.nodeinfoDirectResponseMaxHops.description",
              ),
            },
            {
              type: "toggle",
              name: "rateLimitEnabled",
              label: t("trafficManagement.rateLimitEnabled.label"),
              description: t("trafficManagement.rateLimitEnabled.description"),
            },
            {
              type: "number",
              name: "rateLimitWindowSecs",
              label: t("trafficManagement.rateLimitWindowSecs.label"),
              description: t(
                "trafficManagement.rateLimitWindowSecs.description",
              ),
              properties: {
                suffix: t("unit.second.plural"),
              },
            },
            {
              type: "number",
              name: "rateLimitMaxPackets",
              label: t("trafficManagement.rateLimitMaxPackets.label"),
              description: t(
                "trafficManagement.rateLimitMaxPackets.description",
              ),
            },
            {
              type: "toggle",
              name: "dropUnknownEnabled",
              label: t("trafficManagement.dropUnknownEnabled.label"),
              description: t(
                "trafficManagement.dropUnknownEnabled.description",
              ),
            },
            {
              type: "number",
              name: "unknownPacketThreshold",
              label: t("trafficManagement.unknownPacketThreshold.label"),
              description: t(
                "trafficManagement.unknownPacketThreshold.description",
              ),
            },
            {
              type: "toggle",
              name: "exhaustHopTelemetry",
              label: t("trafficManagement.exhaustHopTelemetry.label"),
              description: t(
                "trafficManagement.exhaustHopTelemetry.description",
              ),
            },
            {
              type: "toggle",
              name: "exhaustHopPosition",
              label: t("trafficManagement.exhaustHopPosition.label"),
              description: t(
                "trafficManagement.exhaustHopPosition.description",
              ),
            },
            {
              type: "toggle",
              name: "routerPreserveHops",
              label: t("trafficManagement.routerPreserveHops.label"),
              description: t(
                "trafficManagement.routerPreserveHops.description",
              ),
            },
          ],
        },
      ]}
    />
  );
};
