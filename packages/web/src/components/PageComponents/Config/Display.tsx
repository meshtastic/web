import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type DisplayValidation,
  DisplayValidationSchema,
} from "@app/validation/config/display.ts";
import { create } from "@bufbuild/protobuf";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import { Protobuf } from "@meshtastic/core";
import { useTranslation } from "react-i18next";

interface DisplayConfigProps {
  onFormInit: DynamicFormFormInit<DisplayValidation>;
}
export const Display = ({ onFormInit }: DisplayConfigProps) => {
  useWaitForConfig({ configCase: "display" });
  const { config, setWorkingConfig, getEffectiveConfig, removeWorkingConfig } =
    useDevice();
  const { t } = useTranslation("deviceConfig");

  const onSubmit = (data: DisplayValidation) => {
    if (deepCompareConfig(config.display, data, true)) {
      removeWorkingConfig("display");
      return;
    }

    setWorkingConfig(
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: "display",
          value: data,
        },
      }),
    );
  };

  return (
    <DynamicForm<DisplayValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={DisplayValidationSchema}
      formId="Config_DisplayConfig"
      defaultValues={config.display}
      values={getEffectiveConfig("display")}
      fieldGroups={[
        {
          label: t("display.title"),
          description: t("display.description"),
          fields: [
            {
              type: "number",
              name: "screenOnSecs",
              label: t("display.screenTimeout.label"),
              description: t("display.screenTimeout.description"),
              properties: {
                suffix: t("unit.second.plural"),
              },
            },
            {
              type: "select",
              name: "gpsFormat",
              label: t("display.gpsDisplayUnits.label"),
              description: t("display.gpsDisplayUnits.description"),
              properties: {
                enumValue:
                  Protobuf.Config.Config_DisplayConfig_GpsCoordinateFormat,
              },
            },
            {
              type: "number",
              name: "autoScreenCarouselSecs",
              label: t("display.carouselDelay.label"),
              description: t("display.carouselDelay.description"),
              properties: {
                suffix: t("unit.second.plural"),
              },
            },
            {
              type: "toggle",
              name: "compassNorthTop",
              label: t("display.compassNorthTop.label"),
              description: t("display.compassNorthTop.description"),
            },
            {
              type: "toggle",
              name: "use12hClock",
              label: t("display.twelveHourClock.label"),
              description: t("display.twelveHourClock.description"),
            },
            {
              type: "toggle",
              name: "flipScreen",
              label: t("display.flipScreen.label"),
              description: t("display.flipScreen.description"),
            },
            {
              type: "select",
              name: "units",
              label: t("display.displayUnits.label"),
              description: t("display.displayUnits.description"),
              properties: {
                enumValue: Protobuf.Config.Config_DisplayConfig_DisplayUnits,
                formatEnumName: true,
              },
            },
            {
              type: "select",
              name: "oled",
              label: t("display.oledType.label"),
              description: t("display.oledType.description"),
              properties: {
                enumValue: Protobuf.Config.Config_DisplayConfig_OledType,
              },
            },
            {
              type: "select",
              name: "displaymode",
              label: t("display.displayMode.label"),
              description: t("display.displayMode.description"),
              properties: {
                enumValue: Protobuf.Config.Config_DisplayConfig_DisplayMode,
                formatEnumName: true,
              },
            },
            {
              type: "toggle",
              name: "headingBold",
              label: t("display.headingBold.label"),
              description: t("display.headingBold.description"),
            },
            {
              type: "toggle",
              name: "wakeOnTapOrMotion",
              label: t("display.wakeOnTapOrMotion.label"),
              description: t("display.wakeOnTapOrMotion.description"),
            },
          ],
        },
      ]}
    />
  );
};
