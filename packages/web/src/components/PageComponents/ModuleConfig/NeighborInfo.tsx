import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type NeighborInfoValidation,
  NeighborInfoValidationSchema,
} from "@app/validation/moduleConfig/neighborInfo.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { useTranslation } from "react-i18next";

interface NeighborInfoModuleConfigProps {
  onFormInit: DynamicFormFormInit<NeighborInfoValidation>;
}

export const NeighborInfo = ({ onFormInit }: NeighborInfoModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "neighborInfo" });

  const { moduleConfig, setChange, getEffectiveModuleConfig, removeChange } =
    useDevice();
  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: NeighborInfoValidation) => {
    if (deepCompareConfig(moduleConfig.neighborInfo, data, true)) {
      removeChange({ type: "moduleConfig", variant: "neighborInfo" });
      return;
    }

    setChange(
      { type: "moduleConfig", variant: "neighborInfo" },
      data,
      moduleConfig.neighborInfo,
    );
  };

  return (
    <DynamicForm<NeighborInfoValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={NeighborInfoValidationSchema}
      defaultValues={moduleConfig.neighborInfo}
      values={getEffectiveModuleConfig("neighborInfo")}
      fieldGroups={[
        {
          label: t("neighborInfo.title"),
          description: t("neighborInfo.description"),
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
              properties: {
                suffix: t("unit.second.plural"),
              },
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
          ],
        },
      ]}
    />
  );
};
