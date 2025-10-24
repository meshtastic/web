import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type StoreForwardValidation,
  StoreForwardValidationSchema,
} from "@app/validation/moduleConfig/storeForward.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { useTranslation } from "react-i18next";

interface StoreForwardModuleConfigProps {
  onFormInit: DynamicFormFormInit<StoreForwardValidation>;
}

export const StoreForward = ({ onFormInit }: StoreForwardModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "storeForward" });

  const { moduleConfig, setChange, getEffectiveModuleConfig, removeChange } =
    useDevice();
  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: StoreForwardValidation) => {
    if (deepCompareConfig(moduleConfig.storeForward, data, true)) {
      removeChange({ type: "moduleConfig", variant: "storeForward" });
      return;
    }

    setChange(
      { type: "moduleConfig", variant: "storeForward" },
      data,
      moduleConfig.storeForward,
    );
  };

  return (
    <DynamicForm<StoreForwardValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={StoreForwardValidationSchema}
      defaultValues={moduleConfig.storeForward}
      values={getEffectiveModuleConfig("storeForward")}
      fieldGroups={[
        {
          label: t("storeForward.title"),
          description: t("storeForward.description"),
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
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "records",
              label: t("storeForward.records.label"),
              description: t("storeForward.records.description"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
              properties: {
                suffix: t("unit.record.plural"),
              },
            },
            {
              type: "number",
              name: "historyReturnMax",
              label: t("storeForward.historyReturnMax.label"),
              description: t("storeForward.historyReturnMax.description"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "historyReturnWindow",
              label: t("storeForward.historyReturnWindow.label"),
              description: t("storeForward.historyReturnWindow.description"),
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
