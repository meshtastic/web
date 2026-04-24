import type * as Protobuf from "@meshtastic/protobufs";

export type ModuleConfigSection = Protobuf.ModuleConfig.ModuleConfig["payloadVariant"]["case"];

export interface ModuleConfig {
  readonly mqtt?: Protobuf.ModuleConfig.ModuleConfig_MQTTConfig;
  readonly serial?: Protobuf.ModuleConfig.ModuleConfig_SerialConfig;
  readonly externalNotification?: Protobuf.ModuleConfig.ModuleConfig_ExternalNotificationConfig;
  readonly storeForward?: Protobuf.ModuleConfig.ModuleConfig_StoreForwardConfig;
  readonly rangeTest?: Protobuf.ModuleConfig.ModuleConfig_RangeTestConfig;
  readonly telemetry?: Protobuf.ModuleConfig.ModuleConfig_TelemetryConfig;
  readonly cannedMessage?: Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig;
  readonly audio?: Protobuf.ModuleConfig.ModuleConfig_AudioConfig;
  readonly remoteHardware?: Protobuf.ModuleConfig.ModuleConfig_RemoteHardwareConfig;
  readonly neighborInfo?: Protobuf.ModuleConfig.ModuleConfig_NeighborInfoConfig;
  readonly ambientLighting?: Protobuf.ModuleConfig.ModuleConfig_AmbientLightingConfig;
  readonly detectionSensor?: Protobuf.ModuleConfig.ModuleConfig_DetectionSensorConfig;
  readonly paxcounter?: Protobuf.ModuleConfig.ModuleConfig_PaxcounterConfig;
}
