import { create } from "@bufbuild/protobuf";
import { Protobuf, Types } from "@meshtastic/core";
import type {
  ValidConfigType,
  ValidModuleConfigType,
} from "@components/Settings/types.ts";
import type { Device } from "@core/stores/deviceStore/index.ts";
import { channelRepo } from "@db";

export interface YAMLExportData {
  version: string;
  metadata: {
    exportedAt: string;
    deviceName?: string;
    hardwareModel?: string;
    firmwareVersion?: string;
    nodeId?: number;
  };
  config: Record<string, any>;
  moduleConfig: Record<string, any>;
  channels: any[];
}

export interface ParsedYAMLField {
  path: string[];
  value: unknown;
  type: "config" | "moduleConfig" | "channel";
  section: string;
  field: string;
  originalPath: string;
}

export class YAMLService {
  static async exportToYAML(device: Device): Promise<string> {
    // Fetch channels from database
    const dbChannels = await channelRepo.getChannels(device.id);

    // Convert DB channels to protobuf Channel format
    const protoChannels = dbChannels.map((ch) => ({
      index: ch.channelIndex as Types.ChannelNumber,
      settings: {
        name: ch.name || undefined,
        psk: ch.psk ? new Uint8Array(Buffer.from(ch.psk, "base64")) : undefined,
        uplinkEnabled: ch.uplinkEnabled,
        downlinkEnabled: ch.downlinkEnabled,
      },
      role: ch.role,
    }));

    const exportData: YAMLExportData = {
      version: "1.0",
      metadata: {
        exportedAt: new Date().toISOString(),
        deviceName: device.hardware.myNodeNum?.toString(),
        hardwareModel: undefined, // MyNodeInfo doesn't have model property
        firmwareVersion: device.hardware.firmwareEdition
          ? Protobuf.Mesh.FirmwareEdition[device.hardware.firmwareEdition]
          : undefined,
        nodeId: device.myNodeNum,
      },
      config: {},
      moduleConfig: {},
      channels: protoChannels,
    };

    // Export config sections
    const configTypes: ValidConfigType[] = [
      "device",
      "position",
      "power",
      "network",
      "display",
      "lora",
      "bluetooth",
      "security",
    ];

    configTypes.forEach((configType) => {
      const config = device.getEffectiveConfig(configType);
      if (config) {
        exportData.config[configType] = config;
      }
    });

    // Export module config sections
    const moduleConfigTypes: ValidModuleConfigType[] = [
      "mqtt",
      "serial",
      "externalNotification",
      "storeForward",
      "rangeTest",
      "telemetry",
      "cannedMessage",
      "audio",
      "neighborInfo",
      "ambientLighting",
      "detectionSensor",
      "paxcounter",
    ];

    moduleConfigTypes.forEach((moduleType) => {
      const config = device.getEffectiveModuleConfig(moduleType);
      if (config) {
        exportData.moduleConfig[moduleType] = config;
      }
    });

    // Convert to YAML string
    const yaml = require("js-yaml");
    return yaml.dump(exportData, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
    });
  }

  static parseYAML(yamlContent: string): YAMLExportData {
    const yaml = require("js-yaml");
    const parsed = yaml.load(yamlContent) as YAMLExportData;

    // Validate basic structure
    if (!parsed.version) {
      throw new Error("Invalid YAML: missing version");
    }

    if (!parsed.config) {
      throw new Error("Invalid YAML: missing config section");
    }

    if (!parsed.moduleConfig) {
      throw new Error("Invalid YAML: missing moduleConfig section");
    }

    if (!Array.isArray(parsed.channels)) {
      throw new Error("Invalid YAML: channels must be an array");
    }

    return parsed;
  }

  static extractFields(parsedData: YAMLExportData): ParsedYAMLField[] {
    const fields: ParsedYAMLField[] = [];

    // Extract config fields
    Object.entries(parsedData.config).forEach(([section, config]) => {
      if (config && typeof config === "object") {
        Object.entries(config).forEach(([field, value]) => {
          if (value !== undefined) {
            fields.push({
              path: ["config", section, field],
              value,
              type: "config",
              section,
              field,
              originalPath: `config.${section}.${field}`,
            });
          }
        });
      }
    });

    // Extract module config fields
    Object.entries(parsedData.moduleConfig).forEach(([section, config]) => {
      if (config && typeof config === "object") {
        Object.entries(config).forEach(([field, value]) => {
          if (value !== undefined) {
            fields.push({
              path: ["moduleConfig", section, field],
              value,
              type: "moduleConfig",
              section,
              field,
              originalPath: `moduleConfig.${section}.${field}`,
            });
          }
        });
      }
    });

    // Extract channel fields
    parsedData.channels.forEach((channel, index) => {
      if (channel.settings) {
        Object.entries(channel.settings).forEach(([field, value]) => {
          if (value !== undefined) {
            fields.push({
              path: ["channels", index.toString(), field],
              value,
              type: "channel",
              section: `Channel ${channel.index}`,
              field,
              originalPath: `channels.${channel.index}.${field}`,
            });
          }
        });
      }
    });

    return fields;
  }

  static async applyToDevice(
    _parsedData: YAMLExportData,
    selectedFields: ParsedYAMLField[],
    device: Device,
  ): Promise<void> {
    // Group fields by type and section for efficient application
    const configUpdates = new Map<ValidConfigType, Record<string, any>>();
    const moduleConfigUpdates = new Map<
      ValidModuleConfigType,
      Record<string, any>
    >();
    const channelUpdates = new Map<number, Record<string, any>>();

    selectedFields.forEach((field) => {
      if (field.type === "config") {
        const configType = field.section as ValidConfigType;
        if (!configUpdates.has(configType)) {
          configUpdates.set(configType, {});
        }
        configUpdates.get(configType)![field.field] = field.value;
      } else if (field.type === "moduleConfig") {
        const moduleType = field.section as ValidModuleConfigType;
        if (!moduleConfigUpdates.has(moduleType)) {
          moduleConfigUpdates.set(moduleType, {});
        }
        moduleConfigUpdates.get(moduleType)![field.field] = field.value;
      } else if (field.type === "channel") {
        const channelIndex = parseInt(field.path[1] || "0");
        if (!channelUpdates.has(channelIndex)) {
          channelUpdates.set(channelIndex, {});
        }
        channelUpdates.get(channelIndex)![field.field] = field.value;
      }
    });

    // Apply config updates
    configUpdates.forEach((updates, configType) => {
      const currentConfig = device.getEffectiveConfig(configType) || {};
      const mergedConfig = { ...currentConfig, ...updates };

      const configMessage = create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: configType,
          value: mergedConfig,
        },
      });

      device.setConfig(configMessage);
      device.setChange(
        { type: "config", variant: configType },
        mergedConfig,
        currentConfig,
      );
    });

    // Apply module config updates
    moduleConfigUpdates.forEach((updates, moduleType) => {
      const currentConfig = device.getEffectiveModuleConfig(moduleType) || {};
      const mergedConfig = { ...currentConfig, ...updates };

      const moduleConfigMessage = create(
        Protobuf.ModuleConfig.ModuleConfigSchema,
        {
          payloadVariant: {
            case: moduleType,
            value: mergedConfig,
          },
        },
      );

      device.setModuleConfig(moduleConfigMessage);
      device.setChange(
        { type: "moduleConfig", variant: moduleType },
        mergedConfig,
        currentConfig,
      );
    });

    // Apply channel updates
    // Fetch channels from database
    const dbChannels = await channelRepo.getChannels(device.id);
    const channelsMap = new Map(
      dbChannels.map((ch) => [ch.channelIndex, ch])
    );

    for (const [channelIndex, updates] of channelUpdates) {
      const existingDbChannel = channelsMap.get(channelIndex);
      if (existingDbChannel) {
        // Convert DB channel to protobuf format for comparison
        const existingChannel = {
          index: channelIndex as Types.ChannelNumber,
          role: existingDbChannel.role,
          settings: {
            name: existingDbChannel.name || undefined,
            psk: existingDbChannel.psk
              ? new Uint8Array(Buffer.from(existingDbChannel.psk, "base64"))
              : undefined,
            uplinkEnabled: existingDbChannel.uplinkEnabled,
            downlinkEnabled: existingDbChannel.downlinkEnabled,
          },
        };

        const mergedSettings = { ...existingChannel.settings, ...updates };
        const updatedChannel = create(Protobuf.Channel.ChannelSchema, {
          ...existingChannel,
          settings: mergedSettings,
        });

        await device.addChannel(updatedChannel);
        device.setChange(
          { type: "channel", index: channelIndex as Types.ChannelNumber },
          updatedChannel,
          existingChannel,
        );
      }
    }
  }

  static downloadYAML(content: string, filename: string): void {
    const blob = new Blob([content], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static readYAMLFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };
      reader.readAsText(file);
    });
  }
}
