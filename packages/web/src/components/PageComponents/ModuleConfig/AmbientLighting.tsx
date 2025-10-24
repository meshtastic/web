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
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { useTranslation } from "react-i18next";

interface AmbientLightingModuleConfigProps {
  onFormInit: DynamicFormFormInit<AmbientLightingValidation>;
}

export const AmbientLighting = ({
  onFormInit,
}: AmbientLightingModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "ambientLighting" });
  const { moduleConfig, setChange, getEffectiveModuleConfig, removeChange } =
    useDevice();
  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: AmbientLightingValidation) => {
    if (deepCompareConfig(moduleConfig.ambientLighting, data, true)) {
      removeChange({ type: "moduleConfig", variant: "ambientLighting" });
      return;
    }

    setChange(
      { type: "moduleConfig", variant: "ambientLighting" },
      data,
      moduleConfig.ambientLighting,
    );
  };

  return (
    <DynamicForm<AmbientLightingValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={AmbientLightingValidationSchema}
      defaultValues={moduleConfig.ambientLighting}
      values={getEffectiveModuleConfig("ambientLighting")}
      fieldGroups={[
        {
          label: t("ambientLighting.title"),
          description: t("ambientLighting.description"),
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
            {
              type: "number",
              name: "red",
              label: t("ambientLighting.red.label"),
              description: t("ambientLighting.red.description"),
            },
            {
              type: "number",
              name: "green",
              label: t("ambientLighting.green.label"),
              description: t("ambientLighting.green.description"),
            },
            {
              type: "number",
              name: "blue",
              label: t("ambientLighting.blue.label"),
              description: t("ambientLighting.blue.description"),
            },
          ],
        },
      ]}
    />
  );
};
