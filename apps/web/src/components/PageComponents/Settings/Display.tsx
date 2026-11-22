import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type DisplayValidation,
  DisplayValidationSchema,
} from "@app/validation/config/display.ts";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { Protobuf } from "@core/protobuf.ts";
import { useConfigEditor, useSignal } from "@core/kmp/hooks";
import {
  CAROUSEL_PRESETS,
  describeInterval,
  intervalChoices,
  SCREEN_ON_PRESETS,
} from "@core/settings/intervals.ts";
import { useTranslation } from "react-i18next";

interface DisplayConfigProps {
  onFormInit: DynamicFormFormInit<DisplayValidation>;
}

const EMPTY_RADIO_SIGNAL = {
  value: {} as { display?: Protobuf.Config.Config_DisplayConfig },
  peek: () => ({}) as { display?: Protobuf.Config.Config_DisplayConfig },
  subscribe: () => () => {},
} as const;

export const Display = ({ onFormInit }: DisplayConfigProps) => {
  useWaitForConfig({ configCase: "display" });
  const { config, getEffectiveConfig } = useDevice();
  const editor = useConfigEditor();
  const radio = useSignal(editor?.radio ?? EMPTY_RADIO_SIGNAL);
  const effective =
    radio.display ??
    (getEffectiveConfig("display") as
      | Protobuf.Config.Config_DisplayConfig
      | undefined);

  const { t } = useTranslation("config");

  // Label -> value map for the select, in the order the choices are offered.
  const intervalOptions = (
    presets: readonly number[],
    current: number | undefined,
    zeroKey: "interval.off" | "interval.deviceDefault",
  ): Record<string, number> =>
    Object.fromEntries(
      intervalChoices(presets, current).map((seconds) => {
        const label = describeInterval(seconds);
        if (label.kind === "zero")
          return [t(zeroKey, { ns: "common" }), seconds];
        if (label.kind === "alwaysOn") {
          return [t("interval.alwaysOn", { ns: "common" }), seconds];
        }
        return [
          t(`interval.${label.unit}`, { ns: "common", count: label.count }),
          seconds,
        ];
      }),
    );

  const onSubmit = (data: DisplayValidation) => {
    if (!editor) return;
    editor.setRadioSection(
      "display",
      data as unknown as Protobuf.Config.Config_DisplayConfig,
    );
  };

  return (
    <DynamicForm<DisplayValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={DisplayValidationSchema}
      defaultValues={config.display}
      values={effective}
      fieldGroups={[
        {
          label: t("display.deviceDisplay.label"),
          description: t("display.deviceDisplay.description"),
          fields: [
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
              name: "headingBold",
              label: t("display.headingBold.label"),
              description: t("display.headingBold.description"),
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
          ],
        },
        {
          label: t("display.advanced.label"),
          description: t("display.advanced.description"),
          fields: [
            {
              type: "select",
              name: "screenOnSecs",
              label: t("display.screenTimeout.label"),
              description: t("display.screenTimeout.description"),
              properties: {
                enumValue: intervalOptions(
                  SCREEN_ON_PRESETS,
                  effective?.screenOnSecs,
                  "interval.deviceDefault",
                ),
              },
            },
            {
              type: "select",
              name: "autoScreenCarouselSecs",
              label: t("display.carouselDelay.label"),
              description: t("display.carouselDelay.description"),
              properties: {
                enumValue: intervalOptions(
                  CAROUSEL_PRESETS,
                  effective?.autoScreenCarouselSecs,
                  "interval.off",
                ),
              },
            },
            {
              type: "toggle",
              name: "wakeOnTapOrMotion",
              label: t("display.wakeOnTapOrMotion.label"),
              description: t("display.wakeOnTapOrMotion.description"),
            },
            {
              type: "toggle",
              name: "flipScreen",
              label: t("display.flipScreen.label"),
              description: t("display.flipScreen.description"),
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
              name: "compassOrientation",
              label: t("display.compassOrientation.label"),
              description: t("display.compassOrientation.description"),
              properties: {
                enumValue:
                  Protobuf.Config.Config_DisplayConfig_CompassOrientation,
                formatEnumName: true,
              },
            },
          ],
        },
      ]}
    />
  );
};
