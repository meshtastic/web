import { IsBoolean, IsOptional, IsString, Length } from "class-validator";

import type { Protobuf } from "@meshtastic/meshtasticjs";

export class UserValidation
  implements Omit<Protobuf.User, "ID" | "macaddr" | "hwModel">
{
  @IsString()
  @IsOptional()
  id: string;

  @Length(2, 30)
  longName: string;

  @Length(1, 4)
  shortName: string;

  @IsBoolean()
  isLicensed: boolean;
}
