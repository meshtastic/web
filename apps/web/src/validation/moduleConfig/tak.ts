import { Protobuf } from "@meshtastic/core";
import { z } from "zod/v4";

const TeamEnum = z.enum(Protobuf.ATAK.Team);
const MemberRoleEnum = z.enum(Protobuf.ATAK.MemberRole);

export const TakValidationSchema = z.object({
  team: TeamEnum,
  role: MemberRoleEnum,
});

export type TakValidation = z.infer<typeof TakValidationSchema>;
