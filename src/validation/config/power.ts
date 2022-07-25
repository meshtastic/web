import { IsBoolean, IsEnum, IsInt } from "class-validator";

import { Protobuf } from "@meshtastic/meshtasticjs";

export class PowerValidation implements Protobuf.Config_PowerConfig {
  @IsEnum(Protobuf.Config_PowerConfig_ChargeCurrent)
  chargeCurrent: Protobuf.Config_PowerConfig_ChargeCurrent;

  @IsBoolean()
  isPowerSaving: boolean;

  @IsInt()
  onBatteryShutdownAfterSecs: number;

  @IsInt()
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
