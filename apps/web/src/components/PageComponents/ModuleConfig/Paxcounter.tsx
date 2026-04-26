import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type PaxcounterValidation,
  PaxcounterValidationSchema,
} from "@app/validation/moduleConfig/paxcounter.ts";
import { DynamicForm, type DynamicFormFormInit } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useTranslation } from "react-i18next";

interface PaxcounterModuleConfigProps {
  onFormInit: DynamicFormFormInit<PaxcounterValidation>;
}

const EMPTY_MODULES_SIGNAL = {
  value: {} as { paxcounter?: Protobuf.ModuleConfig.ModuleConfig_PaxcounterConfig },
  peek: () => ({}) as { paxcounter?: Protobuf.ModuleConfig.ModuleConfig_PaxcounterConfig },
  subscribe: () => () => {},
} as const;

export const Paxcounter = ({ onFormInit }: PaxcounterModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "paxcounter" });

  const { moduleConfig, getEffectiveModuleConfig } = useDevice();
  const editor = useConfigEditor();
  const modules = useSignal(editor?.modules ?? EMPTY_MODULES_SIGNAL);
  const effective =
    modules.paxcounter ??
    (getEffectiveModuleConfig("paxcounter") as
      | Protobuf.ModuleConfig.ModuleConfig_PaxcounterConfig
      | undefined);

  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: PaxcounterValidation) => {
    if (!editor) return;
    editor.setModuleSection(
      "paxcounter",
      data as unknown as Protobuf.ModuleConfig.ModuleConfig_PaxcounterConfig,
    );
  };

  return (
    <DynamicForm<PaxcounterValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={PaxcounterValidationSchema}
      defaultValues={moduleConfig.paxcounter}
      values={effective}
      fieldGroups={[
        {
          label: t("paxcounter.paxcounterConfig.label"),
          description: t("paxcounter.paxcounterConfig.description"),
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
              properties: { suffix: t("unit.second.plural") },
            },
            {
              type: "number",
              name: "wifiThreshold",
              label: t("paxcounter.wifiThreshold.label"),
              description: t("paxcounter.wifiThreshold.description"),
            },
            {
              type: "number",
              name: "bleThreshold",
              label: t("paxcounter.bleThreshold.label"),
              description: t("paxcounter.bleThreshold.description"),
            },
          ],
        },
      ]}
    />
  );
};
