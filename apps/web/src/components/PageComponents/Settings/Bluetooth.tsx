import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type BluetoothValidation,
  BluetoothValidationSchema,
} from "@app/validation/config/bluetooth.ts";
import { DynamicForm, type DynamicFormFormInit } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useTranslation } from "react-i18next";

interface BluetoothConfigProps {
  onFormInit: DynamicFormFormInit<BluetoothValidation>;
}

const EMPTY_RADIO_SIGNAL = {
  value: {} as { bluetooth?: Protobuf.Config.Config_BluetoothConfig },
  peek: () => ({}) as { bluetooth?: Protobuf.Config.Config_BluetoothConfig },
  subscribe: () => () => {},
} as const;

export const Bluetooth = ({ onFormInit }: BluetoothConfigProps) => {
  useWaitForConfig({ configCase: "bluetooth" });

  const { config, getEffectiveConfig } = useDevice();
  const editor = useConfigEditor();
  const radio = useSignal(editor?.radio ?? EMPTY_RADIO_SIGNAL);
  const effective =
    radio.bluetooth ??
    (getEffectiveConfig("bluetooth") as Protobuf.Config.Config_BluetoothConfig | undefined);

  const { t } = useTranslation("config");

  const onSubmit = (data: BluetoothValidation) => {
    if (!editor) return;
    editor.setRadioSection("bluetooth", data as unknown as Protobuf.Config.Config_BluetoothConfig);
  };

  return (
    <DynamicForm<BluetoothValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={BluetoothValidationSchema}
      defaultValues={config.bluetooth}
      values={effective}
      fieldGroups={[
        {
          label: t("bluetooth.bluetoothConfig.label"),
          description: t("bluetooth.bluetoothConfig.description"),
          notes: t("bluetooth.note"),
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("bluetooth.enabled.label"),
              description: t("bluetooth.enabled.description"),
            },
            {
              type: "select",
              name: "mode",
              label: t("bluetooth.pairingMode.label"),
              description: t("bluetooth.pairingMode.description"),
              properties: {
                enumValue: Protobuf.Config.Config_BluetoothConfig_PairingMode,
                formatEnumName: true,
              },
            },
            {
              type: "number",
              name: "fixedPin",
              label: t("bluetooth.pin.label"),
              description: t("bluetooth.pin.description"),
            },
          ],
        },
      ]}
    />
  );
};
