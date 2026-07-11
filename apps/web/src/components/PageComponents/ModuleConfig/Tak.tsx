import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type TakValidation,
  TakValidationSchema,
} from "@app/validation/moduleConfig/tak.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useTranslation } from "react-i18next";

interface TakModuleConfigProps {
  onFormInit: DynamicFormFormInit<TakValidation>;
}

const EMPTY_MODULES_SIGNAL = {
  value: {} as { tak?: Protobuf.ModuleConfig.ModuleConfig_TAKConfig },
  peek: () => ({}) as { tak?: Protobuf.ModuleConfig.ModuleConfig_TAKConfig },
  subscribe: () => () => {},
} as const;

export const Tak = ({ onFormInit }: TakModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "tak" });

  const { moduleConfig, getEffectiveModuleConfig } = useDevice();
  const editor = useConfigEditor();
  const modules = useSignal(editor?.modules ?? EMPTY_MODULES_SIGNAL);
  const effective =
    modules.tak ??
    (getEffectiveModuleConfig("tak") as
      | Protobuf.ModuleConfig.ModuleConfig_TAKConfig
      | undefined);

  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: TakValidation) => {
    if (!editor) return;
    editor.setModuleSection(
      "tak",
      data as unknown as Protobuf.ModuleConfig.ModuleConfig_TAKConfig,
    );
  };

  return (
    <DynamicForm<TakValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={TakValidationSchema}
      defaultValues={moduleConfig.tak}
      values={effective}
      fieldGroups={[
        {
          label: t("tak.title"),
          description: t("tak.description"),
          fields: [
            {
              type: "select",
              name: "team",
              label: t("tak.team.label"),
              description: t("tak.team.description"),
              properties: {
                enumValue: Protobuf.ATAK.Team,
                formatEnumName: true,
              },
            },
            {
              type: "select",
              name: "role",
              label: t("tak.role.label"),
              description: t("tak.role.description"),
              properties: {
                enumValue: Protobuf.ATAK.MemberRole,
                formatEnumName: true,
              },
            },
          ],
        },
      ]}
    />
  );
};
