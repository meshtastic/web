import type { Types } from "@meshtastic/core";

export type ValidConfigType =
  | "device"
  | "position"
  | "power"
  | "network"
  | "display"
  | "lora"
  | "bluetooth"
  | "security";

export type ValidModuleConfigType =
  | "mqtt"
  | "serial"
  | "externalNotification"
  | "storeForward"
  | "rangeTest"
  | "telemetry"
  | "cannedMessage"
  | "audio"
  | "neighborInfo"
  | "ambientLighting"
  | "detectionSensor"
  | "paxcounter";

// Admin message types that can be queued
export type ValidAdminMessageType = "setFixedPosition" | "other";

// Unified config change key type
export type ConfigChangeKey =
  | { type: "config"; variant: ValidConfigType }
  | { type: "moduleConfig"; variant: ValidModuleConfigType }
  | { type: "channel"; index: Types.ChannelNumber }
  | { type: "user" }
  | { type: "adminMessage"; variant: ValidAdminMessageType; id: string };

export type ConfigChangeKeyString = string;

export interface ChangeEntry {
  key: ConfigChangeKey;
  value: unknown;
  timestamp: number;
  originalValue?: unknown;
}
