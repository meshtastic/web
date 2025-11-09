import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type ScriptingValidation,
  ScriptingValidationSchema,
} from "@app/validation/moduleConfig/scripting.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { useTranslation } from "react-i18next";

interface ScriptingModuleConfigProps {
  onFormInit: DynamicFormFormInit<ScriptingValidation>;
}

export const Scripting = ({ onFormInit }: ScriptingModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "scripting" });

  const { moduleConfig, setChange, getEffectiveModuleConfig, removeChange } =
    useDevice();
  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: ScriptingValidation) => {
    if (deepCompareConfig(moduleConfig.scripting, data, true)) {
      removeChange({ type: "moduleConfig", variant: "scripting" });
      return;
    }

    setChange(
      { type: "moduleConfig", variant: "scripting" },
      data,
      moduleConfig.scripting,
    );
  };

  return (
    <DynamicForm<ScriptingValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={ScriptingValidationSchema}
      defaultValues={moduleConfig.scripting}
      values={getEffectiveModuleConfig("scripting")}
      fieldGroups={[
        {
          label: t("scripting.title"),
          description: t("scripting.description"),
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("scripting.enabled.label"),
              description: t("scripting.enabled.description"),
            },
          ],
        },
      ]}
    />
  );
};
