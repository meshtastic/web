import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type NeighborInfoValidation,
  NeighborInfoValidationSchema,
} from "@app/validation/moduleConfig/neighborInfo.ts";
import { DynamicForm, type DynamicFormFormInit } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useTranslation } from "react-i18next";

interface NeighborInfoModuleConfigProps {
  onFormInit: DynamicFormFormInit<NeighborInfoValidation>;
}

const EMPTY_MODULES_SIGNAL = {
  value: {} as { neighborInfo?: Protobuf.ModuleConfig.ModuleConfig_NeighborInfoConfig },
  peek: () => ({}) as { neighborInfo?: Protobuf.ModuleConfig.ModuleConfig_NeighborInfoConfig },
  subscribe: () => () => {},
} as const;

export const NeighborInfo = ({ onFormInit }: NeighborInfoModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "neighborInfo" });

  const { moduleConfig, getEffectiveModuleConfig } = useDevice();
  const editor = useConfigEditor();
  const modules = useSignal(editor?.modules ?? EMPTY_MODULES_SIGNAL);
  const effective =
    modules.neighborInfo ??
    (getEffectiveModuleConfig("neighborInfo") as
      | Protobuf.ModuleConfig.ModuleConfig_NeighborInfoConfig
      | undefined);

  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: NeighborInfoValidation) => {
    if (!editor) return;
    editor.setModuleSection(
      "neighborInfo",
      data as unknown as Protobuf.ModuleConfig.ModuleConfig_NeighborInfoConfig,
    );
  };

  return (
    <DynamicForm<NeighborInfoValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={NeighborInfoValidationSchema}
      defaultValues={moduleConfig.neighborInfo}
      values={effective}
      fieldGroups={[
        {
          label: t("neighborInfo.neighborInfoConfig.label"),
          description: t("neighborInfo.neighborInfoConfig.description"),
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("neighborInfo.enabled.label"),
              description: t("neighborInfo.enabled.description"),
            },
            {
              type: "number",
              name: "updateInterval",
              label: t("neighborInfo.updateInterval.label"),
              description: t("neighborInfo.updateInterval.description"),
              properties: { suffix: t("unit.second.plural") },
            },
            {
              type: "toggle",
              name: "transmitOverLora",
              label: t("neighborInfo.transmitOverLora.label"),
              description: t("neighborInfo.transmitOverLora.description"),
            },
          ],
        },
      ]}
    />
  );
};
