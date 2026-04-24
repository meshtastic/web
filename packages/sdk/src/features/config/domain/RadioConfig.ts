import type * as Protobuf from "@meshtastic/protobufs";

/**
 * The six radio-config sections keyed by their protobuf variant case.
 */
export type RadioConfigSection = Protobuf.Config.Config["payloadVariant"]["case"];

export interface RadioConfig {
  readonly device?: Protobuf.Config.Config_DeviceConfig;
  readonly position?: Protobuf.Config.Config_PositionConfig;
  readonly power?: Protobuf.Config.Config_PowerConfig;
  readonly network?: Protobuf.Config.Config_NetworkConfig;
  readonly display?: Protobuf.Config.Config_DisplayConfig;
  readonly lora?: Protobuf.Config.Config_LoRaConfig;
  readonly bluetooth?: Protobuf.Config.Config_BluetoothConfig;
  readonly security?: Protobuf.Config.Config_SecurityConfig;
  readonly sessionkey?: Protobuf.Config.Config_SessionkeyConfig;
}
