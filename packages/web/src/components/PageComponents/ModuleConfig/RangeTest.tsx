import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type RangeTestValidation,
  RangeTestValidationSchema,
} from "@app/validation/moduleConfig/rangeTest.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/core";
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { useTranslation } from "react-i18next";

interface RangeTestModuleConfigProps {
  onFormInit: DynamicFormFormInit<RangeTestValidation>;
}

export const RangeTest = ({ onFormInit }: RangeTestModuleConfigProps) => {
  useWaitForConfig({ moduleConfigCase: "rangeTest" });

  const { moduleConfig, channels, activeNode, setChange, getEffectiveModuleConfig, removeChange } =
    useDevice();
  const primaryChannel = channels.get(0 as Protobuf.Types.ChannelNumber);
  const isPrimaryChannelPublic = (() => {
    if (!primaryChannel) return false;
    const pskBytes = primaryChannel.settings?.psk;
    const hexLen = pskBytes instanceof Uint8Array ? pskBytes.length : 0;
    // Treat very short/absent keys as effectively "public"/unencrypted.
    return hexLen === 0 || hexLen === 1;
  })();

  const { t } = useTranslation("moduleConfig");

  const onSubmit = (data: RangeTestValidation) => {
    if (deepCompareConfig(moduleConfig.rangeTest, data, true)) {
      removeChange({ type: "moduleConfig", variant: "rangeTest" });
      return;
    }

    setChange(
      { type: "moduleConfig", variant: "rangeTest" },
      data,
      moduleConfig.rangeTest,
    );
  };

  return (
    <DynamicForm<RangeTestValidation>
      isDisabled={isPrimaryChannelPublic}
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={RangeTestValidationSchema}
      defaultValues={{
        ...moduleConfig.rangeTest,
        enabled:
          isPrimaryChannelPublic
            ? false
            : moduleConfig.rangeTest?.enabled ?? false,
      }}
      values={{
        ...getEffectiveModuleConfig("rangeTest"),
        enabled:
          isPrimaryChannelPublic
            ? false
            : getEffectiveModuleConfig("rangeTest")?.enabled ?? false,
      }}
      fieldGroups={[
        {
          label: t("rangeTest.title"),
          description: t("rangeTest.description"),
          fields: [
            {
              type: "toggle",
              name: "enabled",
              label: t("rangeTest.enabled.label"),
              description: t("rangeTest.enabled.description"),
            },
            {
              type: "number",
              name: "sender",
              label: t("rangeTest.sender.label"),
              description: t("rangeTest.sender.description"),
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
              type: "toggle",
              name: "save",
              label: t("rangeTest.save.label"),
              description: t("rangeTest.save.description"),
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
