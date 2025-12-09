import { z } from "zod/v4";
import type {
  YAMLExportData,
  ParsedYAMLField,
} from "@core/services/yamlService.ts";

const MetadataSchema = z.object({
  exportedAt: z.string(),
  deviceName: z.string().optional(),
  hardwareModel: z.string().optional(),
  firmwareVersion: z.string().optional(),
  nodeId: z.number().optional(),
});

const ConfigFieldSchema = z.record(z.string(), z.unknown());

const ChannelSchema = z.object({
  index: z.number(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

const YAMLExportSchema: z.ZodType<YAMLExportData> = z.object({
  version: z.string(),
  metadata: MetadataSchema,
  config: ConfigFieldSchema,
  moduleConfig: ConfigFieldSchema,
  channels: z.array(ChannelSchema),
});

const ParsedYAMLFieldSchema: z.ZodType<ParsedYAMLField> = z.object({
  path: z.array(z.string()),
  value: z.unknown(),
  type: z.enum(["config", "moduleConfig", "channel"]),
  section: z.string(),
  field: z.string(),
  originalPath: z.string(),
});

export class YAMLValidationService {
  static validateYAMLStructure(data: unknown): YAMLExportData {
    try {
      return YAMLExportSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues.map(
          (err: any) => `${err.path.join(".")}: ${err.message}`,
        );
        throw new Error(`Invalid YAML structure:\n${errorMessages.join("\n")}`);
      }
      throw new Error("Invalid YAML structure");
    }
  }

  static validateParsedFields(fields: unknown[]): ParsedYAMLField[] {
    try {
      return z.array(ParsedYAMLFieldSchema).parse(fields);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues.map(
          (err: any) => `${err.path.join(".")}: ${err.message}`,
        );
        throw new Error(
          `Invalid field structure:\n${errorMessages.join("\n")}`,
        );
      }
      throw new Error("Invalid field structure");
    }
  }

  static validateFieldSelection(
    fields: ParsedYAMLField[],
    selectedPaths: string[],
  ): ParsedYAMLField[] {
    const selectedFields = fields.filter((field) =>
      selectedPaths.includes(field.originalPath),
    );

    if (selectedFields.length === 0) {
      throw new Error("No valid fields selected for import");
    }

    return selectedFields;
  }

  static validateYAMLContent(content: string): {
    isValid: boolean;
    error?: string;
    data?: YAMLExportData;
  } {
    try {
      const yaml = require("js-yaml");
      const parsed = yaml.load(content);
      const validated = this.validateYAMLStructure(parsed);

      return {
        isValid: true,
        data: validated,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  static getFieldValidationErrors(
    fields: ParsedYAMLField[],
  ): { field: ParsedYAMLField; error: string }[] {
    const errors: { field: ParsedYAMLField; error: string }[] = [];

    fields.forEach((field) => {
      // Validate field path
      if (field.path.length < 3) {
        errors.push({
          field,
          error: "Invalid field path - must have at least 3 segments",
        });
        return;
      }

      // Validate field type
      if (!["config", "moduleConfig", "channel"].includes(field.type)) {
        errors.push({
          field,
          error: "Invalid field type",
        });
        return;
      }

      // Validate channel index for channel fields
      if (field.type === "channel") {
        const channelIndex = parseInt(field.path[1] || "0");
        if (isNaN(channelIndex) || channelIndex < 0) {
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
    field: ParsedYAMLField,
    targetType: "string" | "number" | "boolean",
  ): unknown {
    if (field.value === null || field.value === undefined) {
      return field.value;
    }

    switch (targetType) {
      case "string":
        return String(field.value);
      case "number":
        const num = Number(field.value);
        return isNaN(num) ? field.value : num;
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
    fields: ParsedYAMLField[],
    deviceConfig: {
      availableConfigs: string[];
      availableModuleConfigs: string[];
      availableChannels: number[];
    },
  ): { field: ParsedYAMLField; error: string }[] {
    const errors: { field: ParsedYAMLField; error: string }[] = [];

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
        const channelIndex = parseInt(field.path[1] || "0");
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
