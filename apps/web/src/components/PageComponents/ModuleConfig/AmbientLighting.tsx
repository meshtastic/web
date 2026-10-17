import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type AmbientLightingValidation,
  AmbientLightingValidationSchema,
} from "@app/validation/moduleConfig/ambientLighting.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AmbientLightingColor } from "./AmbientLightingColor.tsx";

interface AmbientLightingModuleConfigProps {
  onFormInit: DynamicFormFormInit<AmbientLightingValidation>;
}

const EMPTY_MODULES_SIGNAL = {
  value: {} as {
    ambientLighting?: Protobuf.ModuleConfig.ModuleConfig_AmbientLightingConfig;
  },
  peek: () =>
    ({}) as {
      ambientLighting?: Protobuf.ModuleConfig.ModuleConfig_AmbientLightingConfig;
    },
  subscribe: () => () => {},
} as const;

export const AmbientLighting = ({
  onFormInit,
}: AmbientLightingModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "ambientLighting" });

  const { moduleConfig, getEffectiveModuleConfig } = useDevice();
  const editor = useConfigEditor();
  const modules = useSignal(editor?.modules ?? EMPTY_MODULES_SIGNAL);
  const effective =
    modules.ambientLighting ??
    (getEffectiveModuleConfig("ambientLighting") as
      | Protobuf.ModuleConfig.ModuleConfig_AmbientLightingConfig
      | undefined);

  const { t } = useTranslation("moduleConfig");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const onSubmit = (data: AmbientLightingValidation) => {
    if (!editor) return;
    editor.setModuleSection(
      "ambientLighting",
      data as unknown as Protobuf.ModuleConfig.ModuleConfig_AmbientLightingConfig,
    );
  };

  return (
    <DynamicForm<AmbientLightingValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={AmbientLightingValidationSchema}
      defaultValues={moduleConfig.ambientLighting}
      values={effective}
      fieldGroups={[
        {
          label: t("ambientLighting.ambientLightingConfig.label"),
          description: t("ambientLighting.ambientLightingConfig.description"),
          fields: [
            {
              type: "toggle",
              name: "ledState",
              label: t("ambientLighting.ledState.label"),
              description: t("ambientLighting.ledState.description"),
            },
            {
              type: "number",
              name: "current",
              label: t("ambientLighting.current.label"),
              description: t("ambientLighting.current.description"),
            },
          ],
          footer: (
            <AmbientLightingColor
              showAdvanced={showAdvanced}
              onShowAdvancedChange={setShowAdvanced}
            />
          ),
        },
        // Like Android, the separate channels sit behind "Advanced".
        ...(showAdvanced
          ? [
              {
                label: t("ambientLighting.advanced.label"),
                description: t("ambientLighting.advanced.description"),
                fields: [
                  {
                    type: "number" as const,
                    name: "red" as const,
                    label: t("ambientLighting.red.label"),
                    description: t("ambientLighting.red.description"),
                  },
                  {
                    type: "number" as const,
                    name: "green" as const,
                    label: t("ambientLighting.green.label"),
                    description: t("ambientLighting.green.description"),
                  },
                  {
                    type: "number" as const,
                    name: "blue" as const,
                    label: t("ambientLighting.blue.label"),
                    description: t("ambientLighting.blue.description"),
                  },
                ],
              },
            ]
          : []),
      ]}
    />
  );
};
