import { Protobuf } from "@meshtastic/core";
import { z } from "zod/v4";

const GpsCoordinateEnum = z.enum(
  Protobuf.Config.Config_DisplayConfig_DeprecatedGpsCoordinateFormat,
);
const DisplayUnitsEnum = z.enum(
  Protobuf.Config.Config_DisplayConfig_DisplayUnits,
);
const OledTypeEnum = z.enum(Protobuf.Config.Config_DisplayConfig_OledType);
const DisplayModeEnum = z.enum(
  Protobuf.Config.Config_DisplayConfig_DisplayMode,
);
const CompassOrientationEnum = z.enum(
  Protobuf.Config.Config_DisplayConfig_CompassOrientation,
);

export const DisplayValidationSchema = z.object({
  screenOnSecs: z.coerce.number().int().min(0),
  gpsFormat: GpsCoordinateEnum,
  autoScreenCarouselSecs: z.coerce.number().int().min(0),
  compassNorthTop: z.boolean(),
  flipScreen: z.boolean(),
  units: DisplayUnitsEnum,
  oled: OledTypeEnum,
  displaymode: DisplayModeEnum,
  headingBold: z.boolean(),
  wakeOnTapOrMotion: z.boolean(),
  compassOrientation: CompassOrientationEnum,
  use12hClock: z.boolean(),
});

export type DisplayValidation = z.infer<typeof DisplayValidationSchema>;
