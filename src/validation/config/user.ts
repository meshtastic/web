import { IsBoolean, Length } from "class-validator";

import type { Protobuf } from "@meshtastic/meshtasticjs";

export class UserValidation
  implements Omit<Protobuf.User, "macaddr" | "hwModel">
{
  @Length(2, 30)
  id: string;

  @Length(2, 30)
  longName: string;

  @Length(1, 4)
  shortName: string;

  @IsBoolean()
  isLicensed: boolean;
}
