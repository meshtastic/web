import type { Protobuf } from "@meshtastic/core";

/**
 * The radio-config sections keyed by their protobuf variant case (excluding the
 * "no variant" undefined case). Derived directly from the `Config` message, so
 * new firmware variants stay typed automatically — no per-section maintenance.
 */
export type RadioConfigSection = Exclude<
  Protobuf.Config.Config["payloadVariant"]["case"],
  undefined
>;

/** Section -> proto-payload map, derived directly from the `Config` message. */
export type RadioConfig = {
  readonly [V in RadioConfigSection]?: Extract<
    Protobuf.Config.Config["payloadVariant"],
    { case: V }
  >["value"];
};
