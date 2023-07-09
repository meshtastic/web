import { IsBoolean, IsEnum, IsInt } from "class-validator";

import { Protobuf } from "@meshtastic/meshtasticjs";

export class DisplayValidation
  implements Omit<Protobuf.Config_DisplayConfig, keyof Protobuf.native.Message>
{
  @IsInt()
  screenOnSecs: number;

  @IsEnum(Protobuf.Config_DisplayConfig_GpsCoordinateFormat)
  gpsFormat: Protobuf.Config_DisplayConfig_GpsCoordinateFormat;

  @IsInt()
  autoScreenCarouselSecs: number;

  @IsBoolean()
  compassNorthTop: boolean;

  @IsBoolean()
  flipScreen: boolean;

  @IsEnum(Protobuf.Config_DisplayConfig_DisplayUnits)
  units: Protobuf.Config_DisplayConfig_DisplayUnits;

  @IsEnum(Protobuf.Config_DisplayConfig_OledType)
  oled: Protobuf.Config_DisplayConfig_OledType;

  @IsEnum(Protobuf.Config_DisplayConfig_DisplayMode)
  displaymode: Protobuf.Config_DisplayConfig_DisplayMode;

  @IsBoolean()
  headingBold: boolean;

  @IsBoolean()
  wakeOnTapOrMotion: boolean;
}
