import type { PaxcounterValidation } from "@app/validation/moduleConfig/paxcounter.tsx";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { useTranslation } from "react-i18next";
import { Protobuf } from "@meshtastic/js";

export const Paxcounter = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();
  const { t } = useTranslation();

  const onSubmit = (data: PaxcounterValidation) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig.ModuleConfig({
        payloadVariant: {
          case: "paxcounter",
          value: data,
        },
      })
    );
  };

  return (
    <DynamicForm<PaxcounterValidation>
      onSubmit={onSubmit}
      defaultValues={moduleConfig.paxcounter}
      fieldGroups={[
        {
          label: t("Paxcounter Settings"),
          description: "Settings for the Paxcounter module",
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("Module Enabled"),
              description: t("Enable Paxcounter"),
            },
            {
              type: "number",
              name: "paxcounterUpdateInterval",
              label: t("Update Interval (seconds)"),
              description: t(
                "How long to wait between sending paxcounter packets"
              ),
              properties: {
                suffix: "Seconds",
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
