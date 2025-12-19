// Discriminated union of all config sections
export type ConfigSection =
  | { type: "config"; variant: "lora" }
  | { type: "config"; variant: "security" }
  | { type: "config"; variant: "device" }
  | { type: "config"; variant: "position" }
  | { type: "config"; variant: "power" }
  | { type: "config"; variant: "network" }
  | { type: "config"; variant: "display" }
  | { type: "config"; variant: "bluetooth" }
  | { type: "moduleConfig"; variant: "mqtt" }
  | { type: "moduleConfig"; variant: "serial" }
  | { type: "moduleConfig"; variant: "externalNotification" }
  | { type: "moduleConfig"; variant: "storeForward" }
  | { type: "moduleConfig"; variant: "rangeTest" }
  | { type: "moduleConfig"; variant: "telemetry" }
  | { type: "moduleConfig"; variant: "cannedMessage" }
  | { type: "moduleConfig"; variant: "audio" }
  | { type: "moduleConfig"; variant: "remoteHardware" }
  | { type: "moduleConfig"; variant: "neighborInfo" }
  | { type: "moduleConfig"; variant: "ambientLighting" }
  | { type: "moduleConfig"; variant: "detectionSensor" }
  | { type: "moduleConfig"; variant: "paxcounter" }
  | { type: "channel"; variant: string }
  | { type: "config"; variant: "user" };

// Field definition - simplified version of what was in DynamicFormField
export interface FieldDefinition {
  type: string;
  name: string;
  label: string;
  description?: string;
}

// Field metadata stored in the registry
export interface FieldMetadata {
  section: ConfigSection;
  fieldName: string;
  label: string;
  description?: string;
  fieldDefinition: FieldDefinition;
  groupLabel?: string; // e.g., "Waveform Settings"
}

// Change tracking entry
export interface FieldChangeEntry {
  section: ConfigSection;
  fieldName: string;
  newValue: unknown;
  originalValue?: unknown;
  timestamp: number;
}

// Search result
export interface FieldSearchResult {
  field: FieldMetadata;
  matchType: "label" | "description" | "group";
  relevanceScore: number;
}
