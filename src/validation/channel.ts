import { z } from "zod/v4";
import { Protobuf } from "@meshtastic/core";

const RoleEnum = z.enum(
  Protobuf.Channel.Channel_Role,
);

export const Channel_SettingsValidationSchema = z.object({
  channelNum: z.number(),
  psk: z.string(),
  name: z.string().min(0).max(11),
  id: z.int(),
  uplinkEnabled: z.boolean(),
  downlinkEnabled: z.boolean(),
  positionEnabled: z.boolean(),
  preciseLocation: z.boolean(),
  positionPrecision: z.boolean(),
});

export const ChannelValidationSchema = z.object({
  index: z.number(),
  settings: Channel_SettingsValidationSchema,
  role: RoleEnum,
});

export type ChannelValidation = z.infer<typeof ChannelValidationSchema>;
