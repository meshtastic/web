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
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { useTranslation } from "react-i18next";

interface RemoteHardwareModuleConfigProps {
  onFormInit: DynamicFormFormInit<RemoteHardwareValidation>;
}

export const RemoteHardware = ({
  onFormInit,
}: RemoteHardwareModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "remoteHardware" });

  const { moduleConfig, setChange, getEffectiveModuleConfig, removeChange } =
    useDevice();
  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: RemoteHardwareValidation) => {
    if (deepCompareConfig(moduleConfig.remoteHardware, data, true)) {
      removeChange({ type: "moduleConfig", variant: "remoteHardware" });
      return;
    }

    setChange(
      { type: "moduleConfig", variant: "remoteHardware" },
      data,
      moduleConfig.remoteHardware,
    );
  };

  return (
    <DynamicForm<RemoteHardwareValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={RemoteHardwareValidationSchema}
      defaultValues={moduleConfig.remoteHardware}
      values={getEffectiveModuleConfig("remoteHardware")}
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
