import type { Protobuf } from "@meshtastic/core";

/**
 * The module-config sections keyed by their protobuf variant case. Because this
 * is derived from the firmware-current protobufs, the new modules synced in
 * this branch — `trafficManagement`, `statusmessage`, `tak`, `remoteHardware` —
 * are already members with zero extra code.
 */
export type ModuleConfigSection = Exclude<
  Protobuf.ModuleConfig.ModuleConfig["payloadVariant"]["case"],
  undefined
>;

/** Section -> proto-payload map, derived directly from the `ModuleConfig` message. */
export type ModuleConfig = {
  readonly [V in ModuleConfigSection]?: Extract<
    Protobuf.ModuleConfig.ModuleConfig["payloadVariant"],
    { case: V }
  >["value"];
};
