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
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { Protobuf } from "@meshtastic/core";
import { useTranslation } from "react-i18next";

interface TakModuleConfigProps {
  onFormInit: DynamicFormFormInit<TakValidation>;
}

export const Tak = ({ onFormInit }: TakModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "tak" });

  const { moduleConfig, setChange, getEffectiveModuleConfig, removeChange } =
    useDevice();
  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: TakValidation) => {
    if (deepCompareConfig(moduleConfig.tak, data, true)) {
      removeChange({ type: "moduleConfig", variant: "tak" });
      return;
    }

    setChange({ type: "moduleConfig", variant: "tak" }, data, moduleConfig.tak);
  };

  return (
    <DynamicForm<TakValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={TakValidationSchema}
      defaultValues={moduleConfig.tak}
      values={getEffectiveModuleConfig("tak")}
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
