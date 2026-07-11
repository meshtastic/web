import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type RemoteHardwareValidation,
  RemoteHardwareValidationSchema,
} from "@app/validation/moduleConfig/remoteHardware.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import type { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useTranslation } from "react-i18next";

interface RemoteHardwareModuleConfigProps {
  onFormInit: DynamicFormFormInit<RemoteHardwareValidation>;
}

const EMPTY_MODULES_SIGNAL = {
  value: {} as {
    remoteHardware?: Protobuf.ModuleConfig.ModuleConfig_RemoteHardwareConfig;
  },
  peek: () =>
    ({}) as {
      remoteHardware?: Protobuf.ModuleConfig.ModuleConfig_RemoteHardwareConfig;
    },
  subscribe: () => () => {},
} as const;

export const RemoteHardware = ({
  onFormInit,
}: RemoteHardwareModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "remoteHardware" });

  const { moduleConfig, getEffectiveModuleConfig } = useDevice();
  const editor = useConfigEditor();
  const modules = useSignal(editor?.modules ?? EMPTY_MODULES_SIGNAL);
  const effective =
    modules.remoteHardware ??
    (getEffectiveModuleConfig("remoteHardware") as
      | Protobuf.ModuleConfig.ModuleConfig_RemoteHardwareConfig
      | undefined);

  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: RemoteHardwareValidation) => {
    if (!editor) return;
    editor.setModuleSection(
      "remoteHardware",
      data as unknown as Protobuf.ModuleConfig.ModuleConfig_RemoteHardwareConfig,
    );
  };

  return (
    <DynamicForm<RemoteHardwareValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={RemoteHardwareValidationSchema}
      defaultValues={moduleConfig.remoteHardware}
      values={effective}
      fieldGroups={[
        {
          label: t("remoteHardware.title"),
          description: t("remoteHardware.description"),
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("remoteHardware.enabled.label"),
              description: t("remoteHardware.enabled.description"),
            },
            {
              type: "toggle",
              name: "allowUndefinedPinAccess",
              label: t("remoteHardware.allowUndefinedPinAccess.label"),
              description: t(
                "remoteHardware.allowUndefinedPinAccess.description",
              ),
            },
          ],
        },
      ]}
    />
  );
};
