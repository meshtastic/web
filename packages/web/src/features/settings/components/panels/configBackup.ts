import type {
  ConfigBackupData,
  ParsedConfigBackupField,
} from "@core/services/configBackupService.ts";
import { BluetoothValidationSchema } from "@features/settings/validation/config/bluetooth";
import { DeviceValidationSchema } from "@features/settings/validation/config/device";
import { DisplayValidationSchema } from "@features/settings/validation/config/display";
import { LoRaValidationSchema } from "@features/settings/validation/config/lora";
import { NetworkValidationSchema } from "@features/settings/validation/config/network";
import { PositionValidationSchema } from "@features/settings/validation/config/position";
import { PowerValidationSchema } from "@features/settings/validation/config/power";
import { UserValidationSchema } from "@features/settings/validation/config/user";
import { AmbientLightingValidationSchema } from "@features/settings/validation/moduleConfig/ambientLighting";
import { AudioValidationSchema } from "@features/settings/validation/moduleConfig/audio";
import { CannedMessageValidationSchema } from "@features/settings/validation/moduleConfig/cannedMessage";
import { DetectionSensorValidationSchema } from "@features/settings/validation/moduleConfig/detectionSensor";
import { ExternalNotificationValidationSchema } from "@features/settings/validation/moduleConfig/externalNotification";
import { MqttValidationSchema } from "@features/settings/validation/moduleConfig/mqtt";
import { NeighborInfoValidationSchema } from "@features/settings/validation/moduleConfig/neighborInfo";
import { PaxcounterValidationSchema } from "@features/settings/validation/moduleConfig/paxcounter";
import { RangeTestValidationSchema } from "@features/settings/validation/moduleConfig/rangeTest";
import { SerialValidationSchema } from "@features/settings/validation/moduleConfig/serial";
import { StoreForwardValidationSchema } from "@features/settings/validation/moduleConfig/storeForward";
import { TelemetryValidationSchema } from "@features/settings/validation/moduleConfig/telemetry";
import { Protobuf } from "@meshtastic/core";
import { makePskHelpers } from "@shared/utils/pskSchema";
import { z } from "zod/v4";

const { stringSchema } = makePskHelpers([32]);

const MetadataSchema = z.object({
  exportedAt: z.string(),
  deviceName: z.string().optional(),
  hardwareModel: z.string().optional(),
  firmwareVersion: z.string().optional(),
  nodeId: z.number().optional(),
});

const ConfigBackupSecuritySchema = z.object({
  isManaged: z.boolean().optional(),
  adminChannelEnabled: z.boolean().optional(),
  debugLogApiEnabled: z.boolean().optional(),
  serialEnabled: z.boolean().optional(),

  privateKey: stringSchema(true).optional(),
  publicKey: stringSchema(true).optional(),
  adminKey: z.array(stringSchema(true)).optional(),
});

const ConfigSchema = z.object({
  device: DeviceValidationSchema.optional(),
  position: PositionValidationSchema.optional(),
  power: PowerValidationSchema.optional(),
  network: NetworkValidationSchema.optional(),
  display: DisplayValidationSchema.optional(),
  lora: LoRaValidationSchema.optional(),
  bluetooth: BluetoothValidationSchema.optional(),
  security: ConfigBackupSecuritySchema.optional(),
});

const ModuleConfigSchema = z.object({
  mqtt: MqttValidationSchema.optional(),
  serial: SerialValidationSchema.optional(),
  externalNotification: ExternalNotificationValidationSchema.optional(),
  storeForward: StoreForwardValidationSchema.optional(),
  rangeTest: RangeTestValidationSchema.optional(),
  telemetry: TelemetryValidationSchema.optional(),
  cannedMessage: CannedMessageValidationSchema.optional(),
  audio: AudioValidationSchema.optional(),
  neighborInfo: NeighborInfoValidationSchema.optional(),
  ambientLighting: AmbientLightingValidationSchema.optional(),
  detectionSensor: DetectionSensorValidationSchema.optional(),
  paxcounter: PaxcounterValidationSchema.optional(),
});

const RoleEnum = z.enum(Protobuf.Channel.Channel_Role);

const ChannelSchema = z.object({
  index: z.coerce.number(),
  role: RoleEnum,
  settings: z.object({
    channelNum: z.coerce.number(),
    psk: z.string(), // Allow any string for PSK in backup to avoid strict length validation issues during simple import
    name: z.string(),
    id: z.coerce.number(),
    uplinkEnabled: z.boolean(),
    downlinkEnabled: z.boolean(),
    moduleSettings: z.any().optional(), // Allow any structure for moduleSettings
  }),
});

export const ConfigBackupExportSchema = z.object({
  version: z.string(),
  metadata: MetadataSchema,
  user: UserValidationSchema.partial().optional(), // Allow partial user config
  config: ConfigSchema,
  moduleConfig: ModuleConfigSchema,
  channels: z.array(ChannelSchema),
});

const ParsedConfigBackupFieldSchema: z.ZodType<ParsedConfigBackupField> =
  z.object({
    path: z.array(z.string()),
    value: z.unknown(),
    type: z.enum(["config", "moduleConfig", "channel", "user"]),
    section: z.string(),
    field: z.string(),
    originalPath: z.string(),
  });

export class ConfigBackupValidationService {
  static validateConfigBackupStructure(data: unknown): ConfigBackupData {
    try {
      // We cast to any because the Schema type is complex and inferred
      return ConfigBackupExportSchema.parse(
        data,
      ) as unknown as ConfigBackupData;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues.map(
          (err: unknown) => `${err.path.join(".")}: ${err.message}`,
        );
        throw new Error(
          `Invalid ConfigBackup structure:\n${errorMessages.join("\n")}`,
        );
      }
      throw new Error("Invalid ConfigBackup structure");
    }
  }

  static validateParsedFields(fields: unknown[]): ParsedConfigBackupField[] {
    try {
      return z.array(ParsedConfigBackupFieldSchema).parse(fields);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues.map(
          (err: unknown) => `${err.path.join(".")}: ${err.message}`,
        );
        throw new Error(
          `Invalid field structure:\n${errorMessages.join("\n")}`,
        );
      }
      throw new Error("Invalid field structure");
    }
  }

  static validateFieldSelection(
    fields: ParsedConfigBackupField[],
    selectedPaths: string[],
  ): ParsedConfigBackupField[] {
    const selectedFields = fields.filter((field) =>
      selectedPaths.includes(field.originalPath),
    );

    if (selectedFields.length === 0) {
      throw new Error("No valid fields selected for import");
    }

    return selectedFields;
  }

  static getFieldValidationErrors(
    fields: ParsedConfigBackupField[],
  ): { field: ParsedConfigBackupField; error: string }[] {
    const errors: { field: ParsedConfigBackupField; error: string }[] = [];

    fields.forEach((field) => {
      // Validate field path - user fields have 2 segments, others have 3+
      const minPathLength = field.type === "user" ? 2 : 3;
      if (field.path.length < minPathLength) {
        errors.push({
          field,
          error: `Invalid field path - must have at least ${minPathLength} segments`,
        });
        return;
      }

      // Validate field type
      if (!["config", "moduleConfig", "channel", "user"].includes(field.type)) {
        errors.push({
          field,
          error: "Invalid field type",
        });
        return;
      }

      // Validate channel index for channel fields
      if (field.type === "channel") {
        const channelIndex = parseInt(field.path[1] || "0", 10);
        if (Number.isNaN(channelIndex) || channelIndex < 0) {
          errors.push({
            field,
            error: "Invalid channel index",
          });
        }
      }

      // Validate value is not null/undefined for required fields
      if (field.value === null || field.value === undefined) {
        errors.push({
          field,
          error: "Field value cannot be null or undefined",
        });
      }
    });

    return errors;
  }

  static sanitizeFieldValue(
    field: ParsedConfigBackupField,
    targetType: "string" | "number" | "boolean",
  ): unknown {
    if (field.value === null || field.value === undefined) {
      return field.value;
    }

    switch (targetType) {
      case "string":
        return String(field.value);
      case "number": {
        const num = Number(field.value);
        return Number.isNaN(num) ? field.value : num;
      }
      case "boolean":
        if (typeof field.value === "boolean") {
          return field.value;
        }
        if (typeof field.value === "string") {
          const lower = field.value.toLowerCase();
          return lower === "true" || lower === "1";
        }
        if (typeof field.value === "number") {
          return field.value !== 0;
        }
        return Boolean(field.value);
      default:
        return field.value;
    }
  }

  static validateCompatibility(
    fields: ParsedConfigBackupField[],
    deviceConfig: {
      availableConfigs: string[];
      availableModuleConfigs: string[];
      availableChannels: number[];
    },
  ): { field: ParsedConfigBackupField; error: string }[] {
    const errors: { field: ParsedConfigBackupField; error: string }[] = [];

    fields.forEach((field) => {
      if (field.type === "config") {
        if (!deviceConfig.availableConfigs.includes(field.section)) {
          errors.push({
            field,
            error: `Config section '${field.section}' is not available on this device`,
          });
        }
      } else if (field.type === "moduleConfig") {
        if (!deviceConfig.availableModuleConfigs.includes(field.section)) {
          errors.push({
            field,
            error: `Module config section '${field.section}' is not available on this device`,
          });
        }
      } else if (field.type === "channel") {
        const channelIndex = parseInt(field.path[1] || "0", 10);
        if (!deviceConfig.availableChannels.includes(channelIndex)) {
          errors.push({
            field,
            error: `Channel ${channelIndex} is not available on this device`,
          });
        }
      }
    });

    return errors;
  }
}
