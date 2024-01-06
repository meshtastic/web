import type { Message } from "@bufbuild/protobuf";
import type { Protobuf } from "@meshtastic/js";
import { IsBoolean, IsInt, Max, Min } from "class-validator";

export class PowerValidation
  implements Omit<Protobuf.Config.Config_PowerConfig, keyof Message>
{
  @IsBoolean()
  isPowerSaving: boolean;

  @IsInt()
  onBatteryShutdownAfterSecs: number;

  @IsInt()
  @Min(2)
  @Max(4)
  adcMultiplierOverride: number;

  @IsInt()
  waitBluetoothSecs: number;

  @IsInt()
  sdsSecs: number;

  @IsInt()
  lsSecs: number;

  @IsInt()
  minWakeSecs: number;

  @IsInt()
  deviceBatteryInaAddress: number;
}
