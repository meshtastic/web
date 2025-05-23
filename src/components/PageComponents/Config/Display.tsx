import type { DisplayValidation } from "@app/validation/config/display.ts";
import { create } from "@bufbuild/protobuf";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/core";
import { useTranslation } from "react-i18next";

export const Display = () => {
  const { config, setWorkingConfig } = useDevice();
  const { t } = useTranslation();

  const onSubmit = (data: DisplayValidation) => {
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
      defaultValues={config.display}
      fieldGroups={[
        {
          label: t("config_display_groupLabel_displaySettings"),
          description: t("config_display_groupDescription_displaySettings"),
          fields: [
            {
              type: "number",
              name: "screenOnSecs",
              label: t("config_display_fieldLabel_screenTimeout"),
              description: t("config_display_fieldDescription_screenTimeout"),
              properties: {
                suffix: t("common_unit_seconds"),
              },
            },
            {
              type: "select",
              name: "gpsFormat",
              label: t("config_display_fieldLabel_gpsDisplayUnits"),
              description: t("config_display_fieldDescription_gpsDisplayUnits"),
              properties: {
                enumValue:
                  Protobuf.Config.Config_DisplayConfig_GpsCoordinateFormat,
              },
            },
            {
              type: "number",
              name: "autoScreenCarouselSecs",
              label: t("config_display_fieldLabel_carouselDelay"),
              description: t("config_display_fieldDescription_carouselDelay"),
              properties: {
                suffix: t("common_unit_seconds"),
              },
            },
            {
              type: "toggle",
              name: "compassNorthTop",
              label: t("config_display_fieldLabel_compassNorthTop"),
              description: t("config_display_fieldDescription_compassNorthTop"),
            },
            {
              type: "toggle",
              name: "use12hClock",
              label: t("config_display_fieldLabel_twelveHourClock"),
              description: t("config_display_fieldDescription_twelveHourClock"),
            },
            {
              type: "toggle",
              name: "flipScreen",
              label: t("config_display_fieldLabel_flipScreen"),
              description: t("config_display_fieldDescription_flipScreen"),
            },
            {
              type: "select",
              name: "units",
              label: t("config_display_fieldLabel_displayUnits"),
              description: t("config_display_fieldDescription_displayUnits"),
              properties: {
                enumValue: Protobuf.Config.Config_DisplayConfig_DisplayUnits,
                formatEnumName: true,
              },
            },
            {
              type: "select",
              name: "oled",
              label: t("config_display_fieldLabel_oledType"),
              description: t("config_display_fieldDescription_oledType"),
              properties: {
                enumValue: Protobuf.Config.Config_DisplayConfig_OledType,
              },
            },
            {
              type: "select",
              name: "displaymode",
              label: t("config_display_fieldLabel_displayMode"),
              description: t("config_display_fieldDescription_displayMode"),
              properties: {
                enumValue: Protobuf.Config.Config_DisplayConfig_DisplayMode,
                formatEnumName: true,
              },
            },
            {
              type: "toggle",
              name: "headingBold",
              label: t("config_display_fieldLabel_boldHeading"),
              description: t("config_display_fieldDescription_boldHeading"),
            },
            {
              type: "toggle",
              name: "wakeOnTapOrMotion",
              label: t("config_display_fieldLabel_wakeOnTapOrMotion"),
              description: t(
                "config_display_fieldDescription_wakeOnTapOrMotion",
              ),
            },
          ],
        },
      ]}
    />
  );
};
