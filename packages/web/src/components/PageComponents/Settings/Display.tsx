import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type DisplayValidation,
  DisplayValidationSchema,
} from "@app/validation/config/display.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import {
  createFieldMetadata,
  useFieldRegistry,
} from "@core/services/fieldRegistry";
import { useDevice } from "@core/stores";
import { Protobuf } from "@meshtastic/core";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

interface DisplayConfigProps {
  onFormInit: DynamicFormFormInit<DisplayValidation>;
}
export const Display = ({ onFormInit }: DisplayConfigProps) => {
  useWaitForConfig({ configCase: "display" });
  const { config, getEffectiveConfig } = useDevice();
  const {
    registerFields,
    trackChange,
    removeChange: removeFieldChange,
  } = useFieldRegistry();
  const { t } = useTranslation("config");

  const section = { type: "config", variant: "display" } as const;

  const fieldGroups = [
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
        // TODO: This field is deprecated since protobufs 2.7.4 and only has UNUSED=0 value.
        // GPS format has been moved to DeviceUIConfig.gps_format with proper enum values (DEC, DMS, UTM, MGRS, OLC, OSGR, MLS).
        // This should be removed once DeviceUI settings are implemented.
        // See: packages/protobufs/meshtastic/device_ui.proto
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

  // Register fields on mount
  useEffect(() => {
    const metadata = createFieldMetadata(section, fieldGroups);
    registerFields(section, metadata);
  }, [registerFields, fieldGroups, section]);

  const onSubmit = (data: DisplayValidation) => {
    // Track individual field changes
    const originalData = config.display;
    if (!originalData) {
      return;
    }

    (Object.keys(data) as Array<keyof DisplayValidation>).forEach(
      (fieldName) => {
        const newValue = data[fieldName];
        const oldValue = originalData[fieldName];

        if (newValue !== oldValue) {
          trackChange(section, fieldName as string, newValue, oldValue);
        } else {
          removeFieldChange(section, fieldName as string);
        }
      },
    );
  };

  return (
    <DynamicForm<DisplayValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={DisplayValidationSchema}
      defaultValues={config.display}
      values={getEffectiveConfig("display")}
      fieldGroups={fieldGroups}
    />
  );
};
