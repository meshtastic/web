import type * as Protobuf from "@meshtastic/protobufs";

/**
 * The radio-config sections keyed by their protobuf variant case (excluding
 * the "no variant" undefined case).
 */
export type RadioConfigSection = Exclude<
  Protobuf.Config.Config["payloadVariant"]["case"],
  undefined
>;

/**
 * Section -> proto-payload map, derived directly from the Config message so
 * new variants stay typed automatically.
 */
export type RadioConfig = {
  readonly [V in RadioConfigSection]?: Extract<
    Protobuf.Config.Config["payloadVariant"],
    { case: V }
  >["value"];
};
