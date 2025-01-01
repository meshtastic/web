import type { StoreForwardValidation } from "@app/validation/moduleConfig/storeForward.ts";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { useTranslation } from "react-i18next";
import { Protobuf } from "@meshtastic/js";

export const StoreForward = (): JSX.Element => {
  const { moduleConfig, setWorkingModuleConfig } = useDevice();
  const { t } = useTranslation();

  const onSubmit = (data: StoreForwardValidation) => {
    setWorkingModuleConfig(
      new Protobuf.ModuleConfig.ModuleConfig({
        payloadVariant: {
          case: "storeForward",
          value: data,
        },
      })
    );
  };

  return (
    <DynamicForm<StoreForwardValidation>
      onSubmit={onSubmit}
      defaultValues={moduleConfig.storeForward}
      fieldGroups={[
        {
          label: t("Store & Forward Settings"),
          description: t("Settings for the Store & Forward module"),
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("Module Enabled"),
              description: t("Enable Store & Forward"),
            },
            {
              type: "toggle",
              name: "heartbeat",
              label: t("Heartbeat Enabled"),
              description: t("Enable Store & Forward heartbeat"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "records",
              label: t("Number of records"),
              description: t("Number of records to store"),

              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
              properties: {
                suffix: "Records",
              },
            },
            {
              type: "number",
              name: "historyReturnMax",
              label: t("History return max"),
              description: t("Max number of records to return"),
              disabledBy: [
                {
                  fieldName: "enabled",
                },
              ],
            },
            {
              type: "number",
              name: "historyReturnWindow",
              label: t("History return window"),
              description: t("Max number of records to return"),
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
