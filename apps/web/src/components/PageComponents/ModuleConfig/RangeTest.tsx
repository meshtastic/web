import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type RangeTestValidation,
  RangeTestValidationSchema,
} from "@app/validation/moduleConfig/rangeTest.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/sdk";
import { useChannel, useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useTranslation } from "react-i18next";

interface RangeTestModuleConfigProps {
  onFormInit: DynamicFormFormInit<RangeTestValidation>;
}

const EMPTY_MODULES_SIGNAL = {
  value: {} as {
    rangeTest?: Protobuf.ModuleConfig.ModuleConfig_RangeTestConfig;
  },
  peek: () =>
    ({}) as { rangeTest?: Protobuf.ModuleConfig.ModuleConfig_RangeTestConfig },
  subscribe: () => () => {},
} as const;

export const RangeTest = ({ onFormInit }: RangeTestModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "rangeTest" });

  const { moduleConfig, getEffectiveModuleConfig } = useDevice();
  const editor = useConfigEditor();
  const modules = useSignal(editor?.modules ?? EMPTY_MODULES_SIGNAL);
  const effective =
    modules.rangeTest ??
    (getEffectiveModuleConfig("rangeTest") as
      | Protobuf.ModuleConfig.ModuleConfig_RangeTestConfig
      | undefined);

  const { t } = useTranslation("moduleConfig");

  // Like Android, range test is off limits on a public primary channel (a
  // key under two bytes is the default or no key): it would flood a shared
  // mesh. Wait for the primary channel before deciding.
  const primary = useChannel(0);
  const isPublicPrimary =
    primary?.settings !== undefined && primary.settings.psk.length < 2;

  const onSubmit = (data: RangeTestValidation) => {
    if (!editor) return;
    editor.setModuleSection("rangeTest", {
      ...data,
      enabled: isPublicPrimary ? false : data.enabled,
    } as unknown as Protobuf.ModuleConfig.ModuleConfig_RangeTestConfig);
  };

  return (
    <DynamicForm<RangeTestValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={RangeTestValidationSchema}
      defaultValues={moduleConfig.rangeTest}
      values={effective}
      fieldGroups={[
        {
          label: t("rangeTest.rangeTestConfig.label"),
          description: t("rangeTest.rangeTestConfig.description"),
          notes: isPublicPrimary ? t("rangeTest.publicChannel") : undefined,
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("rangeTest.enabled.label"),
              description: t("rangeTest.enabled.description"),
              // Still lets a radio that has it on turn it off.
              disabled: isPublicPrimary && !effective?.enabled,
            },
            {
              type: "number",
              name: "sender",
              label: t("rangeTest.sender.label"),
              description: t("rangeTest.sender.description"),
              properties: { suffix: t("unit.second.plural") },
              disabled: isPublicPrimary,
            },
            {
              type: "toggle",
              name: "save",
              label: t("rangeTest.save.label"),
              description: t("rangeTest.save.description"),
              disabled: isPublicPrimary,
            },
          ],
        },
      ]}
    />
  );
};
