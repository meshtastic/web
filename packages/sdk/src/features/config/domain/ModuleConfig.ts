import type * as Protobuf from "@meshtastic/protobufs";

export type ModuleConfigSection = Exclude<
  Protobuf.ModuleConfig.ModuleConfig["payloadVariant"]["case"],
  undefined
>;

export type ModuleConfig = {
  readonly [V in ModuleConfigSection]?: Extract<
    Protobuf.ModuleConfig.ModuleConfig["payloadVariant"],
    { case: V }
  >["value"];
};
