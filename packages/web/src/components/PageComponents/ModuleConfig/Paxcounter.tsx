import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type PaxcounterValidation,
  PaxcounterValidationSchema,
} from "@app/validation/moduleConfig/paxcounter.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { useTranslation } from "react-i18next";

interface PaxcounterModuleConfigProps {
  onFormInit: DynamicFormFormInit<PaxcounterValidation>;
}

export const Paxcounter = ({ onFormInit }: PaxcounterModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "paxcounter" });

  const { moduleConfig, setChange, getEffectiveModuleConfig, removeChange } =
    useDevice();
  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: PaxcounterValidation) => {
    if (deepCompareConfig(moduleConfig.paxcounter, data, true)) {
      removeChange({ type: "moduleConfig", variant: "paxcounter" });
      return;
    }

    setChange(
      { type: "moduleConfig", variant: "paxcounter" },
      data,
      moduleConfig.paxcounter,
    );
  };

  return (
    <DynamicForm<PaxcounterValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={PaxcounterValidationSchema}
      defaultValues={moduleConfig.paxcounter}
      values={getEffectiveModuleConfig("paxcounter")}
      fieldGroups={[
        {
          label: t("paxcounter.title"),
          description: t("paxcounter.description"),
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("paxcounter.enabled.label"),
              description: t("paxcounter.enabled.description"),
            },
            {
              type: "number",
              name: "paxcounterUpdateInterval",
              label: t("paxcounter.paxcounterUpdateInterval.label"),
              description: t("paxcounter.paxcounterUpdateInterval.description"),
              properties: {
                suffix: t("unit.second.plural"),
              },
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "wifiThreshold",
              label: t("paxcounter.wifiThreshold.label"),
              description: t("paxcounter.wifiThreshold.description"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "bleThreshold",
              label: t("paxcounter.bleThreshold.label"),
              description: t("paxcounter.bleThreshold.description"),
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
