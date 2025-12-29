import { create } from "@bufbuild/protobuf";
import { channelRepo, nodeRepo } from "@data/index";
import { ConfigBackupValidationService } from "@features/settings/components/panels/configBackup";
import { Protobuf, type Types } from "@meshtastic/core";
import type {
  Device,
  ValidConfigType,
  ValidModuleConfigType,
} from "@state/device";
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
      Object.entries(obj).map(([key, value]) => [
        key,
        serializeForConfigBackup(value),
      ]),
    );
  }
  return obj;
}

function processFieldValue(field: string, value: unknown): unknown {
  if (BYTE_FIELDS.has(field) && typeof value === "string") {
    return toByteArray(value);
  }
  if (field === "adminKey" && Array.isArray(value)) {
    return value.map((v) => (typeof v === "string" ? toByteArray(v) : v));
  }
  return value;
}

function extractSectionFields(
  data: Record<string, unknown>,
  type: ParsedConfigBackupField["type"],
  pathPrefix: string,
): ParsedConfigBackupField[] {
  return Object.entries(data).flatMap(([section, config]) => {
    if (!config || typeof config !== "object") return [];
    return Object.entries(config)
      .filter(([, value]) => value !== undefined)
      .map(([field, value]) => ({
        path: [pathPrefix, section, field],
        value,
        type,
        section,
        field,
        originalPath: `${pathPrefix}.${section}.${field}`,
      }));
  });
}

function buildConfigMap<T extends string>(
  types: T[],
  getConfig: (type: T) => Record<string, unknown> | undefined,
): Record<string, unknown> {
  return Object.fromEntries(
    types
      .map((type) => {
        const config = getConfig(type);
        return config && Object.keys(config).length > 0
          ? [type, serializeForConfigBackup(config)]
          : null;
      })
      .filter((entry): entry is [string, unknown] => entry !== null),
  );
}

export class ConfigBackupService {
  static async createBackup(device: Device): Promise<string> {
    return this.createBackupInternal(device, "full");
  }

  static async createChannelOnlyBackup(device: Device): Promise<string> {
    return this.createBackupInternal(device, "channels-only");
  }

  private static async createBackupInternal(
    device: Device,
    backupType: "full" | "channels-only",
  ): Promise<string> {
    const myNodeNum = device.getMyNodeNum();
    const dbChannels = await channelRepo.getChannels(myNodeNum);

    const userConfig =
      backupType === "full" ? await this.fetchUserConfig(myNodeNum) : undefined;

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

    const exportData: ConfigBackupData = {
      version: "1.0",
      backupType,
      metadata: {
        exportedAt: new Date().toISOString(),
        deviceName:
          userConfig?.longName ?? device.hardware.myNodeNum?.toString(),
        hardwareModel: undefined,
        firmwareVersion: device.hardware.firmwareEdition
          ? Protobuf.Mesh.FirmwareEdition[device.hardware.firmwareEdition]
          : undefined,
        nodeId: myNodeNum,
      },
      user: userConfig,
      config:
        backupType === "full"
          ? buildConfigMap(CONFIG_TYPES, (type) =>
              device.getEffectiveConfig(type),
            )
          : {},
      moduleConfig:
        backupType === "full"
          ? buildConfigMap(MODULE_CONFIG_TYPES, (type) =>
              device.getEffectiveModuleConfig(type),
            )
          : {},
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
      isUnmessageable: myNode.isUnmessageable ?? undefined,
    };
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
    const configFields = extractSectionFields(
      parsedData.config,
      "config",
      "config",
    );
    const moduleConfigFields = extractSectionFields(
      parsedData.moduleConfig,
      "moduleConfig",
      "moduleConfig",
    );

    const channelFields = (
      parsedData.channels as Array<{
        index: number;
        settings?: Record<string, unknown>;
      }>
    ).flatMap((channel, index) =>
      channel.settings
        ? Object.entries(channel.settings)
            .filter(([, value]) => value !== undefined)
            .map(([field, value]) => ({
              path: ["channels", index.toString(), field],
              value,
              type: "channel" as const,
              section: `Channel ${channel.index}`,
              field,
              originalPath: `channels.${channel.index}.${field}`,
            }))
        : [],
    );

    const userFields =
      parsedData.user && typeof parsedData.user === "object"
        ? Object.entries(parsedData.user)
            .filter(([, value]) => value !== undefined)
            .map(([field, value]) => ({
              path: ["user", field],
              value,
              type: "user" as const,
              section: "User",
              field,
              originalPath: `user.${field}`,
            }))
        : [];

    return [...configFields, ...moduleConfigFields, ...channelFields, ...userFields];
  }

  static async applyToDevice(
    _parsedData: ConfigBackupData,
    selectedFields: ParsedConfigBackupField[],
    device: Device,
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

    this.applyConfigUpdates(grouped.config, device, updateProgress);
    this.applyModuleConfigUpdates(grouped.moduleConfig, device, updateProgress);
    await this.applyChannelUpdates(
      grouped.channels,
      device,
      updateProgress,
      channelImportMode,
    );
    await this.applyUserUpdates(grouped.user, device, updateProgress);
  }

  private static groupFieldsByType(fields: ParsedConfigBackupField[]) {
    const config = new Map<ValidConfigType, Record<string, unknown>>();
    const moduleConfig = new Map<ValidModuleConfigType, Record<string, unknown>>();
    const channels = new Map<number, Record<string, unknown>>();
    const user: Record<string, unknown> = {};

    for (const field of fields) {
      const processedValue = processFieldValue(field.field, field.value);

      switch (field.type) {
        case "config": {
          const configType = field.section as ValidConfigType;
          const existing = config.get(configType) ?? {};
          config.set(configType, { ...existing, [field.field]: processedValue });
          break;
        }
        case "moduleConfig": {
          const moduleType = field.section as ValidModuleConfigType;
          const existing = moduleConfig.get(moduleType) ?? {};
          moduleConfig.set(moduleType, { ...existing, [field.field]: processedValue });
          break;
        }
        case "channel": {
          const channelIndex = Number.parseInt(field.path[1] ?? "0", 10);
          const existing = channels.get(channelIndex) ?? {};
          channels.set(channelIndex, { ...existing, [field.field]: processedValue });
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
    device: Device,
    updateProgress: (status: string) => void,
  ): void {
    for (const [configType, fieldUpdates] of updates) {
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
    device: Device,
    updateProgress: (status: string) => void,
  ): void {
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
    device: Device,
    updateProgress: (status: string) => void,
    mode: "merge" | "replace" = "merge",
  ): Promise<void> {
    if (updates.size === 0) return;

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
    device: Device,
    updateProgress: (status: string) => void,
  ): Promise<void> {
    if (Object.keys(updates).length === 0) return;

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
