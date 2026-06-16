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
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { useTranslation } from "react-i18next";

interface StatusMessageModuleConfigProps {
  onFormInit: DynamicFormFormInit<StatusMessageValidation>;
}

export const StatusMessage = ({
  onFormInit,
}: StatusMessageModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "statusmessage" });

  const { moduleConfig, setChange, getEffectiveModuleConfig, removeChange } =
    useDevice();
  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: StatusMessageValidation) => {
    if (deepCompareConfig(moduleConfig.statusmessage, data, true)) {
      removeChange({ type: "moduleConfig", variant: "statusmessage" });
      return;
    }

    setChange(
      { type: "moduleConfig", variant: "statusmessage" },
      data,
      moduleConfig.statusmessage,
    );
  };

  return (
    <DynamicForm<StatusMessageValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={StatusMessageValidationSchema}
      defaultValues={moduleConfig.statusmessage}
      values={getEffectiveModuleConfig("statusmessage")}
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
