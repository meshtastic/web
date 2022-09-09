import { IsBoolean, IsInt, Max, Min } from "class-validator";

import type { Protobuf } from "@meshtastic/meshtasticjs";

export class PowerValidation implements Protobuf.Config_PowerConfig {
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
  meshSdsTimeoutSecs: number;

  @IsInt()
  sdsSecs: number;

  @IsInt()
  lsSecs: number;

  @IsInt()
  minWakeSecs: number;
}
