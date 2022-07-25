import { IsBoolean, IsEnum, IsInt, Length } from "class-validator";

import { Protobuf } from "@meshtastic/meshtasticjs";

export class UserValidation implements Omit<Protobuf.User, "macaddr"> {
  @Length(2, 30)
  id: string;

  @Length(2, 30)
  longName: string;

  @Length(1, 4)
  shortName: string;

  @IsEnum(Protobuf.HardwareModel)
  hwModel: Protobuf.HardwareModel;

  @IsBoolean()
  isLicensed: boolean;

  @IsInt()
  txPowerDbm: number;

  @IsInt()
  antGainDbi: number;

  @IsInt()
  antAzimuth: number;
}
