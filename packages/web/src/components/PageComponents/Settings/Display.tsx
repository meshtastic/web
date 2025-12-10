import { useConfigForm } from "@app/pages/Settings/hooks/useConfigForm";
import {
  type DisplayValidation,
  DisplayValidationSchema,
} from "@app/validation/config/display";
import {
  ConfigFormFields,
  type FieldGroup,
} from "@components/Form/ConfigFormFields";
import { Protobuf } from "@meshtastic/core";
import { ConfigFormSkeleton } from "@pages/Settings/SettingsLoading";
import { useTranslation } from "react-i18next";

export const Display = () => {
  const { t } = useTranslation("config");
  const { form, isReady, isDisabledByField } = useConfigForm<DisplayValidation>(
    {
      configType: "display",
      schema: DisplayValidationSchema,
    },
  );

  if (!isReady) {
    return <ConfigFormSkeleton />;
  }

  const fieldGroups: FieldGroup<DisplayValidation>[] = [
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
              Protobuf.Config
                .Config_DisplayConfig_DeprecatedGpsCoordinateFormat,
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
  ];

  return (
    <ConfigFormFields
      form={form}
      fieldGroups={fieldGroups}
      isDisabledByField={isDisabledByField}
    />
  );
};
