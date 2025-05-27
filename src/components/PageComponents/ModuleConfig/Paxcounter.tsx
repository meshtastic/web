import type { PaxcounterValidation } from "@app/validation/moduleConfig/paxcounter.ts";
import { create } from "@bufbuild/protobuf";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/core";
import { useTranslation } from "react-i18next";

export const Paxcounter = () => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();
  const { t } = useTranslation("moduleConfig");

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
          label: t("paxcounter.title"),
          description: t("paxcounter.description"),
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("paxcounter.enabled.label"),
              description: t("paxcounter.enabled.description"),
            },
            {
              type: "number",
              name: "paxcounterUpdateInterval",
              label: t("paxcounter.paxcounterUpdateInterval.label"),
              description: t("paxcounter.paxcounterUpdateInterval.description"),
              properties: {
                suffix: t("unit.second.plural"),
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
              label: t("paxcounter.wifiThreshold.label"),
              description: t("paxcounter.wifiThreshold.description"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "bleThreshold",
              label: t("paxcounter.bleThreshold.label"),
              description: t("paxcounter.bleThreshold.description"),
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
