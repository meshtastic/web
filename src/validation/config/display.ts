import { z } from "zod/v4";
import { Protobuf } from "@meshtastic/core";

const GpsCoordinateEnum = z.enum(
  Protobuf.Config.Config_DisplayConfig_GpsCoordinateFormat,
);
const DisplayUnitsEnum = z.enum(
  Protobuf.Config.Config_DisplayConfig_DisplayUnits,
);
const OledTypeEnum = z.enum(
  Protobuf.Config.Config_DisplayConfig_OledType,
);
const DisplayModeEnum = z.enum(
  Protobuf.Config.Config_DisplayConfig_DisplayMode,
);
const CompassOrientationEnum = z.enum(
  Protobuf.Config.Config_DisplayConfig_CompassOrientation,
);

export const DisplayValidationSchema = z.object({
  screenOnSecs: z.int(),
  gpsFormat: GpsCoordinateEnum,
  autoScreenCarouselSecs: z.int(),
  compassNorthTop: z.boolean(),
  flipScreen: z.boolean(),
  units: DisplayUnitsEnum,
  oled: OledTypeEnum,
  displaymode: DisplayModeEnum,
  headingBold: z.boolean(),
  wakeOnTapOrMotion: z.boolean(),
  compassOrientation: CompassOrientationEnum,
});

export type DisplayValidation = z.infer<typeof DisplayValidationSchema>;
