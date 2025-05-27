import { useDevice } from "@core/stores/deviceStore.ts";
import type { NeighborInfoValidation } from "@app/validation/moduleConfig/neighborInfo.ts";
import { create } from "@bufbuild/protobuf";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { Protobuf } from "@meshtastic/core";
import { useTranslation } from "react-i18next";

export const NeighborInfo = () => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();
  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: NeighborInfoValidation) => {
    setWorkingModuleConfig(
      create(Protobuf.ModuleConfig.ModuleConfigSchema, {
        payloadVariant: {
          case: "neighborInfo",
          value: data,
        },
      }),
    );
  };

  return (
    <DynamicForm<NeighborInfoValidation>
      onSubmit={onSubmit}
      defaultValues={moduleConfig.neighborInfo}
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
