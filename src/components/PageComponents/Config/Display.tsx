import type { DisplayValidation } from "@app/validation/config/display.tsx";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/js";
import { useTranslation } from "react-i18next";

export const Display = (): JSX.Element => {
  const { config, setWorkingConfig } = useDevice();
  const { t } = useTranslation();

  const onSubmit = (data: DisplayValidation) => {
    setWorkingConfig(
      new Protobuf.Config.Config({
        payloadVariant: {
          case: "display",
          value: data,
        },
      })
    );
  };

  return (
    <DynamicForm<DisplayValidation>
      onSubmit={onSubmit}
      defaultValues={config.display}
      fieldGroups={[
        {
          label: t("Display Settings"),
          description: t("Settings for the device display"),
          fields: [
            {
              type: "number",
              name: "screenOnSecs",
              label: t("Screen Timeout"),
              description: t("Turn off the display after this long"),
              properties: {
                suffix: "Seconds",
              },
            },
            {
              type: "select",
              name: "gpsFormat",
              label: t("GPS Display Units"),
              description: t("Coordinate display format"),
              properties: {
                enumValue:
                  Protobuf.Config.Config_DisplayConfig_GpsCoordinateFormat,
              },
            },
            {
              type: "number",
              name: "autoScreenCarouselSecs",
              label: t("Carousel Delay"),
              description: t("How fast to cycle through windows"),
              properties: {
                suffix: "Seconds",
              },
            },
            {
              type: "toggle",
              name: "compassNorthTop",
              label: t("Compass North Top"),
              description: t("Fix north to the top of compass"),
            },
            {
              type: "toggle",
              name: "flipScreen",
              label: t("Flip Screen"),
              description: t("Flip display 180 degrees"),
            },
            {
              type: "select",
              name: "units",
              label: t("Display Units"),
              description: t("Display metric or imperial units"),
              properties: {
                enumValue: Protobuf.Config.Config_DisplayConfig_DisplayUnits,
                formatEnumName: true,
              },
            },
            {
              type: "select",
              name: "oled",
              label: t("OLED Type"),
              description: t("Type of OLED screen attached to the device"),
              properties: {
                enumValue: Protobuf.Config.Config_DisplayConfig_OledType,
              },
            },
            {
              type: "select",
              name: "displaymode",
              label: t("Display Mode"),
              description: t("Screen layout variant"),
              properties: {
                enumValue: Protobuf.Config.Config_DisplayConfig_DisplayMode,
                formatEnumName: true,
              },
            },
            {
              type: "toggle",
              name: "headingBold",
              label: t("Bold Heading"),
              description: t("Bolden the heading text"),
            },
            {
              type: "toggle",
              name: "wakeOnTapOrMotion",
              label: t("Wake on Tap or Motion"),
              description: t("Wake the device on tap or motion"),
            },
          ],
        },
      ]}
    />
  );
};
