import type { Message } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/js";
import { IsBoolean, IsEnum, IsInt } from "class-validator";

export class DisplayValidation
  implements Omit<Protobuf.Config.Config_DisplayConfig, keyof Message>
{
  @IsInt()
  screenOnSecs: number;

  @IsEnum(Protobuf.Config.Config_DisplayConfig_GpsCoordinateFormat)
  gpsFormat: Protobuf.Config.Config_DisplayConfig_GpsCoordinateFormat;

  @IsInt()
  autoScreenCarouselSecs: number;

  @IsBoolean()
  compassNorthTop: boolean;

  @IsBoolean()
  flipScreen: boolean;

  @IsEnum(Protobuf.Config.Config_DisplayConfig_DisplayUnits)
  units: Protobuf.Config.Config_DisplayConfig_DisplayUnits;

  @IsEnum(Protobuf.Config.Config_DisplayConfig_OledType)
  oled: Protobuf.Config.Config_DisplayConfig_OledType;

  @IsEnum(Protobuf.Config.Config_DisplayConfig_DisplayMode)
  displaymode: Protobuf.Config.Config_DisplayConfig_DisplayMode;

  @IsBoolean()
  headingBold: boolean;

  @IsBoolean()
  wakeOnTapOrMotion: boolean;
}
