import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type StoreForwardValidation,
  StoreForwardValidationSchema,
} from "@app/validation/moduleConfig/storeForward.ts";
import { DynamicForm, type DynamicFormFormInit } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useTranslation } from "react-i18next";

interface StoreForwardModuleConfigProps {
  onFormInit: DynamicFormFormInit<StoreForwardValidation>;
}

const EMPTY_MODULES_SIGNAL = {
  value: {} as { storeForward?: Protobuf.ModuleConfig.ModuleConfig_StoreForwardConfig },
  peek: () => ({}) as { storeForward?: Protobuf.ModuleConfig.ModuleConfig_StoreForwardConfig },
  subscribe: () => () => {},
} as const;

export const StoreForward = ({ onFormInit }: StoreForwardModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "storeForward" });

  const { moduleConfig, getEffectiveModuleConfig } = useDevice();
  const editor = useConfigEditor();
  const modules = useSignal(editor?.modules ?? EMPTY_MODULES_SIGNAL);
  const effective =
    modules.storeForward ??
    (getEffectiveModuleConfig("storeForward") as
      | Protobuf.ModuleConfig.ModuleConfig_StoreForwardConfig
      | undefined);

  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: StoreForwardValidation) => {
    if (!editor) return;
    editor.setModuleSection(
      "storeForward",
      data as unknown as Protobuf.ModuleConfig.ModuleConfig_StoreForwardConfig,
    );
  };

  return (
    <DynamicForm<StoreForwardValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={StoreForwardValidationSchema}
      defaultValues={moduleConfig.storeForward}
      values={effective}
      fieldGroups={[
        {
          label: t("storeForward.storeForwardConfig.label"),
          description: t("storeForward.storeForwardConfig.description"),
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("storeForward.enabled.label"),
              description: t("storeForward.enabled.description"),
            },
            {
              type: "toggle",
              name: "heartbeat",
              label: t("storeForward.heartbeat.label"),
              description: t("storeForward.heartbeat.description"),
            },
            {
              type: "number",
              name: "records",
              label: t("storeForward.records.label"),
              description: t("storeForward.records.description"),
              properties: { suffix: t("unit.record.plural") },
            },
            {
              type: "number",
              name: "historyReturnMax",
              label: t("storeForward.historyReturnMax.label"),
              description: t("storeForward.historyReturnMax.description"),
            },
            {
              type: "number",
              name: "historyReturnWindow",
              label: t("storeForward.historyReturnWindow.label"),
              description: t("storeForward.historyReturnWindow.description"),
            },
            {
              type: "toggle",
              name: "isServer",
              label: t("storeForward.isServer.label"),
              description: t("storeForward.isServer.description"),
            },
          ],
        },
      ]}
    />
  );
};
