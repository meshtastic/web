import { useDevice } from "@app/core/stores/deviceStore.ts";
import type { NeighborInfoValidation } from "@app/validation/moduleConfig/neighborInfo.tsx";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useTranslation } from "react-i18next";
import { Protobuf } from "@meshtastic/js";

export const NeighborInfo = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();
  const { t } = useTranslation();

  const onSubmit = (data: NeighborInfoValidation) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig.ModuleConfig({
        payloadVariant: {
          case: "neighborInfo",
          value: data,
        },
      })
    );
  };

  return (
    <DynamicForm<NeighborInfoValidation>
      onSubmit={onSubmit}
      defaultValues={moduleConfig.neighborInfo}
      fieldGroups={[
        {
          label: t("Neighbor Info Settings"),
          description: t("Settings for the Neighbor Info module"),
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("Enabled"),
              description: t("Enable or disable Neighbor Info Module"),
            },
            {
              type: "number",
              name: "updateInterval",
              label: t("Update Interval"),
              description: t(
                "Interval in seconds of how often we should try to send our Neighbor Info to the mesh"
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
