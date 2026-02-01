import { create } from "@bufbuild/protobuf";
import { channelRepo, nodeRepo } from "@data/index";
import { configCacheRepo } from "@data/repositories";
import { ConfigBackupValidationService } from "@features/settings/components/panels/configBackup";
import { Protobuf, type Types } from "@meshtastic/core";
import type { ValidConfigType, ValidModuleConfigType } from "@state/device";
import { useDeviceStore } from "@state/index.ts";
import { fromByteArray, toByteArray } from "base64-js";
import yaml from "js-yaml";

export interface ConfigBackupUserConfig {
  longName?: string;
  shortName?: string;
  isLicensed?: boolean;
  isUnmessageable: boolean;
}

export interface ConfigBackupData {
  version: string;
  backupType?: "full" | "channels-only";
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

export interface ChannelImportOptions {
  mode: "merge" | "replace";
}

export interface ParsedConfigBackupField {
  path: string[];
  value: unknown;
  type: "config" | "moduleConfig" | "channel" | "user";
  section: string;
  field: string;
  originalPath: string;
}

export interface BackupMetadata {
  firmwareVersion?: string;
}

const CONFIG_TYPES: ValidConfigType[] = [
  "device",
  "position",
  "power",
  "network",
  "display",
  "lora",
  "bluetooth",
  "security",
];

const MODULE_CONFIG_TYPES: ValidModuleConfigType[] = [
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

const BYTE_FIELDS = new Set(["psk", "privateKey", "publicKey", "adminKey"]);

function serializeForConfigBackup(obj: unknown): unknown {
  if (obj instanceof Uint8Array) return fromByteArray(obj);
  if (typeof obj === "bigint") return Number(obj);
  if (Array.isArray(obj)) return obj.map(serializeForConfigBackup);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, serializeForConfigBackup(v)]),
    );
  }
  return obj;
}

function processFieldValue(fieldName: string, value: unknown): unknown {
  if (BYTE_FIELDS.has(fieldName)) {
    if (typeof value === "string") {
      return toByteArray(value);
    }
    if (Array.isArray(value)) {
      return value.map((v) =>
        typeof v === "string" ? toByteArray(v) : new Uint8Array(),
      );
    }
  }
  return value;
}

function buildConfigMap<T extends string>(
  types: T[],
  getConfig: (type: T) => unknown,
): Record<string, unknown> {
  return Object.fromEntries(
    types
      .map((type) => {
        const config = getConfig(type);
        if (!config) return null;
        return [type, serializeForConfigBackup(config)];
      })
      .filter((entry): entry is [string, unknown] => entry !== null),
  );
}

export class ConfigBackupService {
  /**
   * Get the active device from the store (for import operations)
   */
  private static getDevice() {
    const device = useDeviceStore.getState().device;
    if (!device) {
      throw new Error("No active device");
    }
    return device;
  }

  /**
   * Create a full config backup from the database
   */
  static async createBackup(
    ownerNodeNum: number,
    metadata?: BackupMetadata,
  ): Promise<string> {
    return this.createBackupInternal(ownerNodeNum, "full", metadata);
  }

  /**
   * Create a channels-only backup from the database
   */
  static async createChannelOnlyBackup(ownerNodeNum: number): Promise<string> {
    return this.createBackupInternal(ownerNodeNum, "channels-only");
  }

  private static async createBackupInternal(
    ownerNodeNum: number,
    backupType: "full" | "channels-only",
    metadata?: BackupMetadata,
  ): Promise<string> {
    const dbChannels = await channelRepo.getChannels(ownerNodeNum);

    const userConfig =
      backupType === "full"
        ? await this.fetchUserConfig(ownerNodeNum)
        : undefined;

    // Load config from database cache
    const cachedConfig = await configCacheRepo.getCachedConfig(ownerNodeNum);

    const protoChannels = dbChannels.map((ch) => ({
      index: ch.channelIndex as Types.ChannelNumber,
      settings: {
        name: ch.name || undefined,
        psk: ch.psk || undefined,
        uplinkEnabled: ch.uplinkEnabled,
        downlinkEnabled: ch.downlinkEnabled,
        moduleSettings: {
          positionPrecision: ch.positionPrecision,
        },
      },
      role: ch.role,
    }));

    // Build config maps from database cache
    const configData =
      backupType === "full" && cachedConfig
        ? buildConfigMap(CONFIG_TYPES, (type) => {
            const config = cachedConfig.config as Record<string, unknown>;
            return config[type];
          })
        : {};

    const moduleConfigData =
      backupType === "full" && cachedConfig
        ? buildConfigMap(MODULE_CONFIG_TYPES, (type) => {
            const moduleConfig = cachedConfig.moduleConfig as Record<
              string,
              unknown
            >;
            return moduleConfig[type];
          })
        : {};

    const exportData: ConfigBackupData = {
      version: "1.0",
      backupType,
      metadata: {
        exportedAt: new Date().toISOString(),
        deviceName: userConfig?.longName ?? ownerNodeNum.toString(),
        hardwareModel: undefined,
        firmwareVersion:
          metadata?.firmwareVersion ??
          cachedConfig?.firmwareVersion ??
          undefined,
        nodeId: ownerNodeNum,
      },
      user: userConfig,
      config: configData,
      moduleConfig: moduleConfigData,
      channels: protoChannels,
    };

    return yaml.dump(exportData, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
    });
  }

  private static async fetchUserConfig(
    myNodeNum: number | undefined,
  ): Promise<ConfigBackupUserConfig | undefined> {
    if (!myNodeNum) return undefined;

    // Get the device's own node entry (ownerNodeNum == nodeNum for self)
    const myNode = await nodeRepo.getNode(myNodeNum, myNodeNum);
    if (!myNode) return undefined;

    return {
      longName: myNode.longName ?? undefined,
      shortName: myNode.shortName ?? undefined,
      isLicensed: myNode.isLicensed ?? undefined,
      isUnmessageable: false,
    };
  }

  static parseBackup(yamlContent: string): ConfigBackupData {
    const parsed = yaml.load(yamlContent) as ConfigBackupData;
    ConfigBackupValidationService.validateConfigBackupStructure(parsed);
    return parsed;
  }

  static extractFields(data: ConfigBackupData): ParsedConfigBackupField[] {
    const fields: ParsedConfigBackupField[] = [];

    // Extract config fields
    for (const [section, config] of Object.entries(data.config)) {
      if (config && typeof config === "object") {
        for (const [field, value] of Object.entries(
          config as Record<string, unknown>,
        )) {
          fields.push({
            path: ["config", section, field],
            value,
            type: "config",
            section,
            field,
            originalPath: `config.${section}.${field}`,
          });
        }
      }
    }

    // Extract module config fields
    for (const [section, config] of Object.entries(data.moduleConfig)) {
      if (config && typeof config === "object") {
        for (const [field, value] of Object.entries(
          config as Record<string, unknown>,
        )) {
          fields.push({
            path: ["moduleConfig", section, field],
            value,
            type: "moduleConfig",
            section,
            field,
            originalPath: `moduleConfig.${section}.${field}`,
          });
        }
      }
    }

    // Extract channel fields
    for (const channel of data.channels) {
      const ch = channel as {
        index: number;
        settings?: Record<string, unknown>;
      };
      if (ch.settings) {
        for (const [field, value] of Object.entries(ch.settings)) {
          fields.push({
            path: ["channels", String(ch.index), "settings", field],
            value,
            type: "channel",
            section: String(ch.index),
            field,
            originalPath: `channels.${ch.index}.settings.${field}`,
          });
        }
      }
    }

    // Extract user fields
    const userFields: ParsedConfigBackupField[] = [];
    if (data.user) {
      for (const [field, value] of Object.entries(data.user)) {
        userFields.push({
          path: ["user", field],
          value,
          type: "user",
          section: "user",
          field,
          originalPath: `user.${field}`,
        });
      }
    }

    return [
      ...fields.sort((a, b) => a.originalPath.localeCompare(b.originalPath)),
      ...userFields,
    ];
  }

  /**
   * Apply selected fields to the device.
   * Uses the active device from the store.
   */
  static async applyToDevice(
    _parsedData: ConfigBackupData,
    selectedFields: ParsedConfigBackupField[],
    onProgress?: (percent: number, status: string) => void,
    options?: { channelImportMode?: "merge" | "replace" },
  ): Promise<void> {
    const grouped = this.groupFieldsByType(selectedFields);
    const channelImportMode = options?.channelImportMode ?? "merge";

    const totalSteps =
      grouped.config.size +
      grouped.moduleConfig.size +
      grouped.channels.size +
      (Object.keys(grouped.user).length > 0 ? 1 : 0);

    let currentStep = 0;
    const updateProgress = (stepName: string) => {
      currentStep++;
      onProgress?.(
        Math.min(100, Math.round((currentStep / totalSteps) * 100)),
        stepName,
      );
    };

    this.applyConfigUpdates(grouped.config, updateProgress);
    this.applyModuleConfigUpdates(grouped.moduleConfig, updateProgress);
    await this.applyChannelUpdates(
      grouped.channels,
      updateProgress,
      channelImportMode,
    );
    await this.applyUserUpdates(grouped.user, updateProgress);
  }

  private static groupFieldsByType(fields: ParsedConfigBackupField[]) {
    const config = new Map<ValidConfigType, Record<string, unknown>>();
    const moduleConfig = new Map<
      ValidModuleConfigType,
      Record<string, unknown>
    >();
    const channels = new Map<number, Record<string, unknown>>();
    const user: Record<string, unknown> = {};

    for (const field of fields) {
      const processedValue = processFieldValue(field.field, field.value);

      switch (field.type) {
        case "config": {
          const configType = field.section as ValidConfigType;
          const existing = config.get(configType) ?? {};
          config.set(configType, {
            ...existing,
            [field.field]: processedValue,
          });
          break;
        }
        case "moduleConfig": {
          const moduleType = field.section as ValidModuleConfigType;
          const existing = moduleConfig.get(moduleType) ?? {};
          moduleConfig.set(moduleType, {
            ...existing,
            [field.field]: processedValue,
          });
          break;
        }
        case "channel": {
          const channelIndex = Number.parseInt(field.section, 10);
          const existing = channels.get(channelIndex) ?? {};
          channels.set(channelIndex, {
            ...existing,
            [field.field]: processedValue,
          });
          break;
        }
        case "user":
          user[field.field] = processedValue;
          break;
      }
    }

    return { config, moduleConfig, channels, user };
  }

  private static applyConfigUpdates(
    updates: Map<ValidConfigType, Record<string, unknown>>,
    updateProgress: (status: string) => void,
  ): void {
    for (const [configType, fieldUpdates] of updates) {
      const device = this.getDevice();
      updateProgress(`Applying ${configType} config...`);
      const currentConfig = device.getEffectiveConfig(configType) ?? {};
      const mergedConfig = { ...currentConfig, ...fieldUpdates };

      device.setConfig(
        create(Protobuf.Config.ConfigSchema, {
          payloadVariant: { case: configType, value: mergedConfig },
        }),
      );
      device.setChange(
        { type: "config", variant: configType },
        mergedConfig,
        currentConfig,
      );
    }
  }

  private static applyModuleConfigUpdates(
    updates: Map<ValidModuleConfigType, Record<string, unknown>>,
    updateProgress: (status: string) => void,
  ): void {
    const device = this.getDevice();
    for (const [moduleType, fieldUpdates] of updates) {
      updateProgress(`Applying ${moduleType} module config...`);
      const currentConfig = device.getEffectiveModuleConfig(moduleType) ?? {};
      const mergedConfig = { ...currentConfig, ...fieldUpdates };

      device.setModuleConfig(
        create(Protobuf.ModuleConfig.ModuleConfigSchema, {
          payloadVariant: { case: moduleType, value: mergedConfig },
        }),
      );
      device.setChange(
        { type: "moduleConfig", variant: moduleType },
        mergedConfig,
        currentConfig,
      );
    }
  }

  private static async applyChannelUpdates(
    updates: Map<number, Record<string, unknown>>,
    updateProgress: (status: string) => void,
    mode: "merge" | "replace" = "merge",
  ): Promise<void> {
    if (updates.size === 0) return;

    const device = this.getDevice();
    const dbChannels = await channelRepo.getChannels(device.id);
    const channelsMap = new Map(dbChannels.map((ch) => [ch.channelIndex, ch]));

    // In replace mode, disable channels not in the import (except primary channel 0)
    if (mode === "replace") {
      for (const [channelIndex, existingChannel] of channelsMap) {
        // Skip primary channel (index 0) - it can never be disabled
        if (channelIndex === 0) continue;
        // Skip channels that are being updated
        if (updates.has(channelIndex)) continue;
        // Skip channels that are already disabled
        if (existingChannel.role === 0) continue;

        updateProgress(`Disabling Channel ${channelIndex}...`);
        const disabledChannel = create(Protobuf.Channel.ChannelSchema, {
          index: channelIndex as Types.ChannelNumber,
          role: Protobuf.Channel.Channel_Role.DISABLED,
          settings: {},
        });
        await device.addChannel(disabledChannel);
      }
    }

    for (const [channelIndex, fieldUpdates] of updates) {
      updateProgress(`Applying Channel ${channelIndex}...`);
      const existingDbChannel = channelsMap.get(channelIndex);
      if (!existingDbChannel) continue;

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

      const updatedChannel = create(Protobuf.Channel.ChannelSchema, {
        ...existingChannel,
        settings: { ...existingChannel.settings, ...fieldUpdates },
      });

      await device.addChannel(updatedChannel);
      device.setChange(
        { type: "channel", index: channelIndex as Types.ChannelNumber },
        updatedChannel,
        existingChannel,
      );
    }
  }

  private static async applyUserUpdates(
    updates: Record<string, unknown>,
    updateProgress: (status: string) => void,
  ): Promise<void> {
    if (Object.keys(updates).length === 0) return;

    const device = this.getDevice();
    updateProgress("Applying user config...");
    const currentUser = await this.fetchUserConfig(device.getMyNodeNum());

    const mergedUser = { ...currentUser, ...updates };
    const userData = create(Protobuf.Mesh.UserSchema, {
      longName: mergedUser.longName as string | undefined,
      shortName: mergedUser.shortName as string | undefined,
      isLicensed: mergedUser.isLicensed as boolean | undefined,
      isUnmessagable: mergedUser.isUnmessageable as boolean | undefined,
    });

    device.connection?.setOwner(userData);
    device.setChange({ type: "user" }, mergedUser, currentUser ?? {});
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
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  }
}
