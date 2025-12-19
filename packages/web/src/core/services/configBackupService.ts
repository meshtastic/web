import { create } from "@bufbuild/protobuf";
import type {
  ValidConfigType,
  ValidModuleConfigType,
} from "@components/Settings/types.ts";
import type { Device } from "@state/device";
import { channelRepo, nodeRepo } from "@data/index";
import { Protobuf, type Types } from "@meshtastic/core";
import { fromByteArray, toByteArray } from "base64-js";
import yaml from "js-yaml";
import { ConfigBackupValidationService } from "../../validation/configBackup.ts";

export interface ConfigBackupUserConfig {
  longName?: string;
  shortName?: string;
  isLicensed?: boolean;
  isUnmessageable?: boolean;
}

export interface ConfigBackupData {
  version: string;
  metadata: {
    exportedAt: string;
    deviceName?: string;
    hardwareModel?: string;
    firmwareVersion?: string;
    nodeId?: number;
  };
  user?: ConfigBackupUserConfig;
  config: Record<string, unknown>;
  moduleConfig: Record<string, unknown>;
  channels: unknown[];
}

export interface ParsedConfigBackupField {
  path: string[];
  value: unknown;
  type: "config" | "moduleConfig" | "channel" | "user";
  section: string;
  field: string;
  originalPath: string;
}

// Helper to recursively convert Uint8Array to Base64 and BigInt to number
function serializeForConfigBackup(obj: unknown): unknown {
  if (obj instanceof Uint8Array) {
    return fromByteArray(obj);
  }
  if (typeof obj === "bigint") {
    // Convert BigInt to number (safe for values within Number.MAX_SAFE_INTEGER)
    return Number(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeForConfigBackup);
  }
  if (obj && typeof obj === "object") {
    const newObj: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.hasOwn(obj, key)) {
        newObj[key] = serializeForConfigBackup(
          (obj as Record<string, unknown>)[key],
        );
      }
    }
    return newObj;
  }
  return obj;
}

export class ConfigBackupService {
  static async createBackup(device: Device): Promise<string> {
    const myNodeNum = device.getMyNodeNum();

    // Fetch channels from database
    const dbChannels = await channelRepo.getChannels(device.id);

    // Fetch user info from the device's own node
    let userConfig: ConfigBackupUserConfig | undefined;
    if (myNodeNum) {
      const myNode = await nodeRepo.getNode(device.id, myNodeNum);
      if (myNode) {
        userConfig = {
          longName: myNode.longName ?? undefined,
          shortName: myNode.shortName ?? undefined,
          isLicensed: myNode.isLicensed ?? undefined,
          isUnmessageable: myNode.isUnmessageable ?? undefined,
        };
      }
    }

    // Convert DB channels to protobuf Channel format
    const protoChannels = dbChannels.map((ch) => ({
      index: ch.channelIndex as Types.ChannelNumber,
      settings: {
        name: ch.name || undefined,
        psk: ch.psk || undefined, // Keep as string (Base64) for export
        uplinkEnabled: ch.uplinkEnabled,
        downlinkEnabled: ch.downlinkEnabled,
        moduleSettings: ch.moduleSettings,
      },
      role: ch.role,
    }));

    const exportData: ConfigBackupData = {
      version: "1.0",
      metadata: {
        exportedAt: new Date().toISOString(),
        deviceName:
          userConfig?.longName ?? device.hardware.myNodeNum?.toString(),
        hardwareModel: undefined, // MyNodeInfo doesn't have model property
        firmwareVersion: device.hardware.firmwareEdition
          ? Protobuf.Mesh.FirmwareEdition[device.hardware.firmwareEdition]
          : undefined,
        nodeId: myNodeNum,
      },
      user: userConfig,
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
      // Only export if config has meaningful data (not just an empty object)
      if (config && Object.keys(config).length > 0) {
        exportData.config[configType] = serializeForConfigBackup(config);
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
      // Only export if config has meaningful data (not just an empty object)
      if (config && Object.keys(config).length > 0) {
        exportData.moduleConfig[moduleType] = serializeForConfigBackup(config);
      }
    });

    // Convert to YAML string
    return yaml.dump(exportData, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
    });
  }

  static parseBackup(yamlContent: string): ConfigBackupData {
    const parsed = yaml.load(yamlContent);
    return ConfigBackupValidationService.validateConfigBackupStructure(
      parsed,
    ) as ConfigBackupData;
  }

  static extractFields(
    parsedData: ConfigBackupData,
  ): ParsedConfigBackupField[] {
    const fields: ParsedConfigBackupField[] = [];

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
    (
      parsedData.channels as Array<{
        index: number;
        settings?: Record<string, unknown>;
      }>
    ).forEach((channel, index) => {
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

    // Extract user fields
    if (parsedData.user && typeof parsedData.user === "object") {
      Object.entries(parsedData.user).forEach(([field, value]) => {
        if (value !== undefined) {
          fields.push({
            path: ["user", field],
            value,
            type: "user",
            section: "User",
            field,
            originalPath: `user.${field}`,
          });
        }
      });
    }

    return fields;
  }

  static async applyToDevice(
    _parsedData: ConfigBackupData,
    selectedFields: ParsedConfigBackupField[],
    device: Device,
    onProgress?: (percent: number, status: string) => void,
  ): Promise<void> {
    // Group fields by type and section for efficient application
    const configUpdates = new Map<ValidConfigType, Record<string, unknown>>();
    const moduleConfigUpdates = new Map<
      ValidModuleConfigType,
      Record<string, unknown>
    >();
    const channelUpdates = new Map<number, Record<string, unknown>>();
    const userUpdates: Record<string, unknown> = {};

    // Helper to convert value back to bytes if needed
    const processValue = (field: string, value: unknown): unknown => {
      const byteFields = ["psk", "privateKey", "publicKey", "adminKey"];
      if (byteFields.includes(field) && typeof value === "string") {
        return toByteArray(value);
      }
      if (field === "adminKey" && Array.isArray(value)) {
        return value.map((v) => (typeof v === "string" ? toByteArray(v) : v));
      }
      return value;
    };

    selectedFields.forEach((field) => {
      const processedValue = processValue(field.field, field.value);

      if (field.type === "config") {
        const configType = field.section as ValidConfigType;
        if (!configUpdates.has(configType)) {
          configUpdates.set(configType, {});
        }
        configUpdates.get(configType)![field.field] = processedValue;
      } else if (field.type === "moduleConfig") {
        const moduleType = field.section as ValidModuleConfigType;
        if (!moduleConfigUpdates.has(moduleType)) {
          moduleConfigUpdates.set(moduleType, {});
        }
        moduleConfigUpdates.get(moduleType)![field.field] = processedValue;
      } else if (field.type === "channel") {
        const channelIndex = parseInt(field.path[1] || "0", 10);
        if (!channelUpdates.has(channelIndex)) {
          channelUpdates.set(channelIndex, {});
        }
        channelUpdates.get(channelIndex)![field.field] = processedValue;
      } else if (field.type === "user") {
        userUpdates[field.field] = processedValue;
      }
    });

    const hasUserUpdates = Object.keys(userUpdates).length > 0;
    const totalSteps =
      configUpdates.size +
      moduleConfigUpdates.size +
      channelUpdates.size +
      (hasUserUpdates ? 1 : 0);
    let currentStep = 0;

    const updateProgress = (stepName: string) => {
      currentStep++;
      if (onProgress) {
        onProgress(
          Math.min(100, Math.round((currentStep / totalSteps) * 100)),
          stepName,
        );
      }
    };

    // Apply config updates
    configUpdates.forEach((updates, configType) => {
      updateProgress(`Applying ${configType} config...`);
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
      updateProgress(`Applying ${moduleType} module config...`);
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
    if (channelUpdates.size > 0) {
      // Fetch channels from database
      const dbChannels = await channelRepo.getChannels(device.id);
      const channelsMap = new Map(
        dbChannels.map((ch) => [ch.channelIndex, ch]),
      );

      for (const [channelIndex, updates] of channelUpdates) {
        updateProgress(`Applying Channel ${channelIndex}...`);
        const existingDbChannel = channelsMap.get(channelIndex);
        if (existingDbChannel) {
          // Convert DB channel to protobuf format for comparison
          const existingChannel = {
            index: channelIndex as Types.ChannelNumber,
            role: existingDbChannel.role,
            settings: {
              name: existingDbChannel.name || undefined,
              psk: existingDbChannel.psk
                ? toByteArray(existingDbChannel.psk)
                : undefined,
              uplinkEnabled: existingDbChannel.uplinkEnabled ?? false,
              downlinkEnabled: existingDbChannel.downlinkEnabled ?? false,
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

    // Apply user config updates
    if (hasUserUpdates) {
      updateProgress("Applying user config...");

      // Get current user data from node
      let currentUser: ConfigBackupUserConfig = {};
      const myNodeNum = device.getMyNodeNum();
      if (myNodeNum) {
        const myNode = await nodeRepo.getNode(device.id, myNodeNum);
        if (myNode) {
          currentUser = {
            longName: myNode.longName ?? undefined,
            shortName: myNode.shortName ?? undefined,
            isLicensed: myNode.isLicensed ?? undefined,
            isUnmessageable: myNode.isUnmessageable ?? undefined,
          };
        }
      }

      const mergedUser = { ...currentUser, ...userUpdates };
      const userData = create(Protobuf.Mesh.UserSchema, {
        longName: mergedUser.longName as string | undefined,
        shortName: mergedUser.shortName as string | undefined,
        isLicensed: mergedUser.isLicensed as boolean | undefined,
      });

      device.connection?.setOwner(userData);
      device.setChange({ type: "user" }, mergedUser, currentUser);
    }
  }

  static downloadBackup(content: string, filename: string): void {
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

  static readBackupFile(file: File): Promise<string> {
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
