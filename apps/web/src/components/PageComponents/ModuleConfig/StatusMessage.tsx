import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type StatusMessageValidation,
  StatusMessageValidationSchema,
} from "@app/validation/moduleConfig/statusMessage.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import type { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useTranslation } from "react-i18next";

interface StatusMessageModuleConfigProps {
  onFormInit: DynamicFormFormInit<StatusMessageValidation>;
}

const EMPTY_MODULES_SIGNAL = {
  value: {} as {
    statusmessage?: Protobuf.ModuleConfig.ModuleConfig_StatusMessageConfig;
  },
  peek: () =>
    ({}) as {
      statusmessage?: Protobuf.ModuleConfig.ModuleConfig_StatusMessageConfig;
    },
  subscribe: () => () => {},
} as const;

export const StatusMessage = ({
  onFormInit,
}: StatusMessageModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "statusmessage" });

  const { moduleConfig, getEffectiveModuleConfig } = useDevice();
  const editor = useConfigEditor();
  const modules = useSignal(editor?.modules ?? EMPTY_MODULES_SIGNAL);
  const effective =
    modules.statusmessage ??
    (getEffectiveModuleConfig("statusmessage") as
      | Protobuf.ModuleConfig.ModuleConfig_StatusMessageConfig
      | undefined);

  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: StatusMessageValidation) => {
    if (!editor) return;
    editor.setModuleSection(
      "statusmessage",
      data as unknown as Protobuf.ModuleConfig.ModuleConfig_StatusMessageConfig,
    );
  };

  return (
    <DynamicForm<StatusMessageValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={StatusMessageValidationSchema}
      defaultValues={moduleConfig.statusmessage}
      values={effective}
      fieldGroups={[
        {
          label: t("statusMessage.title"),
          description: t("statusMessage.description"),
          fields: [
            {
              type: "text",
              name: "nodeStatus",
              label: t("statusMessage.nodeStatus.label"),
              description: t("statusMessage.nodeStatus.description"),
              properties: {
                fieldLength: {
                  max: 200,
                  showCharacterCount: true,
                },
              },
            },
          ],
        },
      ]}
    />
  );
};
