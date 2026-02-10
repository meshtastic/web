import { create, toBinary } from "@bufbuild/protobuf";
import {
  buildChannelProtobuf,
  buildConfigProtobuf,
  buildModuleConfigProtobuf,
} from "@data/hooks/usePendingChanges.ts";
import { configCacheRepo, nodeRepo } from "@data/repositories";
import { Protobuf } from "@meshtastic/core";
import { useDeviceStore } from "@state/index.ts";
import logger from "./logger.ts";

/**
 * AdminCommandService - Centralized service for sending admin messages to devices
 */
class AdminCommandService {
  /**
   * Get the active device from the store
   */
  private getDevice() {
    const device = useDeviceStore.getState().device;
    if (!device) {
      throw new Error("No active device");
    }
    return device;
  }

  /**
   * Get the current myNodeNum
   */
  private getMyNodeNum(): number {
    return this.getDevice().hardware.myNodeNum;
  }

  /**
   * Send an admin message to the device
   */
  private sendAdminMessage(message: Protobuf.Admin.AdminMessage): void {
    this.getDevice().sendAdminMessage(message);
  }

  /**
   * Set or remove a node as favorite
   * Sends admin message to device AND updates local database
   */
  async setFavoriteNode(nodeNum: number, isFavorite: boolean): Promise<void> {
    const myNodeNum = this.getMyNodeNum();

    logger.debug(
      `[AdminCommands] Setting node ${nodeNum} favorite=${isFavorite}`,
    );

    // Send admin message to device
    this.sendAdminMessage(
      create(Protobuf.Admin.AdminMessageSchema, {
        payloadVariant: {
          case: isFavorite ? "setFavoriteNode" : "removeFavoriteNode",
          value: nodeNum,
        },
      }),
    );

    // Update local database
    await nodeRepo.updateFavorite(myNodeNum, nodeNum, isFavorite);
  }

  /**
   * Set or remove a node as ignored
   * Sends admin message to device AND updates local database
   */
  async setIgnoredNode(nodeNum: number, isIgnored: boolean): Promise<void> {
    const myNodeNum = this.getMyNodeNum();

    logger.debug(
      `[AdminCommands] Setting node ${nodeNum} ignored=${isIgnored}`,
    );

    // Send admin message to device
    this.sendAdminMessage(
      create(Protobuf.Admin.AdminMessageSchema, {
        payloadVariant: {
          case: isIgnored ? "setIgnoredNode" : "removeIgnoredNode",
          value: nodeNum,
        },
      }),
    );

    // Update local database
    await nodeRepo.updateIgnored(myNodeNum, nodeNum, isIgnored);
  }

  /**
   * Request device to reboot
   */
  rebootDevice(seconds = 5): void {
    logger.info(`[AdminCommands] Rebooting device in ${seconds} seconds`);

    this.sendAdminMessage(
      create(Protobuf.Admin.AdminMessageSchema, {
        payloadVariant: {
          case: "rebootSeconds",
          value: seconds,
        },
      }),
    );
  }

  /**
   * Request device to shutdown
   */
  shutdownDevice(seconds = 5): void {
    logger.info(`[AdminCommands] Shutting down device in ${seconds} seconds`);

    this.sendAdminMessage(
      create(Protobuf.Admin.AdminMessageSchema, {
        payloadVariant: {
          case: "shutdownSeconds",
          value: seconds,
        },
      }),
    );
  }

  /**
   * Factory reset the device
   */
  factoryResetDevice(): void {
    logger.warn("[AdminCommands] Factory resetting device");

    this.sendAdminMessage(
      create(Protobuf.Admin.AdminMessageSchema, {
        payloadVariant: {
          case: "factoryResetDevice",
          value: 1,
        },
      }),
    );
  }

  /**
   * Reset the node database on the device
   */
  resetNodeDb(): void {
    logger.warn("[AdminCommands] Resetting node database");

    this.sendAdminMessage(
      create(Protobuf.Admin.AdminMessageSchema, {
        payloadVariant: {
          case: "nodedbReset",
          value: 1,
        },
      }),
    );
  }

  /**
   * Set fixed position on device
   */
  setFixedPosition(position: {
    latitudeI: number;
    longitudeI: number;
    altitude?: number;
    time?: number;
  }): void {
    logger.debug("[AdminCommands] Setting fixed position", position);

    this.sendAdminMessage(
      create(Protobuf.Admin.AdminMessageSchema, {
        payloadVariant: {
          case: "setFixedPosition",
          value: create(Protobuf.Mesh.PositionSchema, {
            latitudeI: position.latitudeI,
            longitudeI: position.longitudeI,
            altitude: position.altitude,
            time: position.time,
          }),
        },
      }),
    );
  }

  /**
   * Remove fixed position from device
   */
  removeFixedPosition(): void {
    logger.debug("[AdminCommands] Removing fixed position");

    this.sendAdminMessage(
      create(Protobuf.Admin.AdminMessageSchema, {
        payloadVariant: {
          case: "removeFixedPosition",
          value: true,
        },
      }),
    );
  }

  /**
   * Set the device's time to current time
   */
  setTime(): void {
    const time = Math.floor(Date.now() / 1000);
    logger.debug(`[AdminCommands] Setting device time to ${time}`);

    this.sendAdminMessage(
      create(Protobuf.Admin.AdminMessageSchema, {
        payloadVariant: {
          case: "setTimeOnly",
          value: time,
        },
      }),
    );
  }

  /**
   * Enter DFU mode for firmware updates
   */
  enterDfuMode(): void {
    logger.info("[AdminCommands] Entering DFU mode");

    this.sendAdminMessage(
      create(Protobuf.Admin.AdminMessageSchema, {
        payloadVariant: {
          case: "enterDfuModeRequest",
          value: true,
        },
      }),
    );
  }

  /**
   * Remove a node from the device's node database
   */
  removeNode(nodeNum: number): void {
    logger.debug(`[AdminCommands] Removing node ${nodeNum} from device`);

    this.sendAdminMessage(
      create(Protobuf.Admin.AdminMessageSchema, {
        payloadVariant: {
          case: "removeByNodenum",
          value: nodeNum,
        },
      }),
    );
  }

  /**
   * Create a fixed position admin message for queueing
   */
  createSetFixedPositionMessage(position: {
    latitudeI: number;
    longitudeI: number;
    altitude?: number;
    time?: number;
  }): Protobuf.Admin.AdminMessage {
    return create(Protobuf.Admin.AdminMessageSchema, {
      payloadVariant: {
        case: "setFixedPosition",
        value: create(Protobuf.Mesh.PositionSchema, {
          latitudeI: position.latitudeI,
          longitudeI: position.longitudeI,
          altitude: position.altitude,
          time: position.time,
        }),
      },
    });
  }

  /**
   * Create a remove fixed position admin message for queueing
   */
  createRemoveFixedPositionMessage(): Protobuf.Admin.AdminMessage {
    return create(Protobuf.Admin.AdminMessageSchema, {
      payloadVariant: {
        case: "removeFixedPosition",
        value: true,
      },
    });
  }

  /**
   * Send a batch of queued admin messages
   * Used by useSaveSettings to send all queued admin messages at once
   */
  async sendQueuedMessages(
    messages: Protobuf.Admin.AdminMessage[],
  ): Promise<void> {
    const connection = this.getDevice().connection;
    if (!connection) {
      throw new Error("No connection available");
    }

    await Promise.all(
      messages.map((message) =>
        connection.sendPacket(
          toBinary(Protobuf.Admin.AdminMessageSchema, message),
          Protobuf.Portnums.PortNum.ADMIN_APP,
          "self",
        ),
      ),
    );
  }

  // ===========================================================================
  // Config Operations
  // ===========================================================================

  /**
   * Get the connection for config operations
   */
  private getConnection() {
    const connection = this.getDevice().connection;
    if (!connection) {
      throw new Error("No connection available");
    }
    return connection;
  }

  /**
   * Save a single config variant to the device
   */
  async saveConfig(config: Protobuf.Config.Config): Promise<void> {
    const connection = this.getConnection();
    logger.debug(
      `[AdminCommands] Saving config: ${config.payloadVariant.case}`,
    );
    await connection.setConfig(config);
  }

  /**
   * Save a single module config variant to the device
   */
  async saveModuleConfig(
    moduleConfig: Protobuf.ModuleConfig.ModuleConfig,
  ): Promise<void> {
    const connection = this.getConnection();
    logger.debug(
      `[AdminCommands] Saving module config: ${moduleConfig.payloadVariant.case}`,
    );
    await connection.setModuleConfig(moduleConfig);
  }

  /**
   * Save a channel to the device
   */
  async saveChannel(channel: Protobuf.Channel.Channel): Promise<void> {
    const connection = this.getConnection();
    logger.debug(
      `[AdminCommands] Saving channel: ${
        channel.settings?.name ?? channel.index
      }`,
    );
    await connection.setChannel(channel);
  }

  /**
   * Commit config changes on the device (required after setConfig/setModuleConfig)
   */
  async commitConfig(): Promise<void> {
    const connection = this.getConnection();
    logger.debug("[AdminCommands] Committing config changes");
    await connection.commitEditSettings();
  }

  /**
   * Set owner/user info on the device
   */
  async setOwner(user: Protobuf.Mesh.User): Promise<void> {
    const connection = this.getConnection();
    logger.debug(
      `[AdminCommands] Setting owner: ${user.longName} (${user.shortName})`,
    );
    await connection.setOwner(user);
  }

  /**
   * Save all pending config changes from database to device
   *
   * @param ownerNodeNum - The device's node number
   * @returns Object with counts of saved changes
   */
  async saveAllPendingChanges(ownerNodeNum: number): Promise<{
    configCount: number;
    moduleConfigCount: number;
    channelCount: number;
  }> {
    const connection = this.getConnection();

    // Load pending changes from database
    const pendingChanges =
      await configCacheRepo.getPendingChanges(ownerNodeNum);

    // Load base config from database
    const cachedConfig = await configCacheRepo.getCachedConfig(ownerNodeNum);

    if (!cachedConfig) {
      throw new Error("No cached config found for device");
    }

    // Convert to protobuf format
    const configProtobufs = buildConfigProtobuf(
      pendingChanges,
      cachedConfig.config as Protobuf.LocalOnly.LocalConfig,
    );
    const moduleConfigProtobufs = buildModuleConfigProtobuf(
      pendingChanges,
      cachedConfig.moduleConfig as Protobuf.LocalOnly.LocalModuleConfig,
    );
    const channelProtobufs = buildChannelProtobuf(pendingChanges);

    logger.info(
      `[AdminCommands] Saving ${configProtobufs.length} configs, ${moduleConfigProtobufs.length} module configs, ${channelProtobufs.length} channels`,
    );

    // Save channels first (they don't need commit)
    for (const channel of channelProtobufs) {
      await connection.setChannel(channel);
    }

    // Save configs
    for (const config of configProtobufs) {
      await connection.setConfig(config);
    }

    // Save module configs
    for (const moduleConfig of moduleConfigProtobufs) {
      await connection.setModuleConfig(moduleConfig);
    }

    // Commit if there were config changes
    if (configProtobufs.length > 0 || moduleConfigProtobufs.length > 0) {
      await connection.commitEditSettings();
    }

    // Clear pending changes from database after successful save
    await configCacheRepo.clearAllLocalChanges(ownerNodeNum);

    return {
      configCount: configProtobufs.length,
      moduleConfigCount: moduleConfigProtobufs.length,
      channelCount: channelProtobufs.length,
    };
  }

  /**
   * Get count of pending changes from database
   */
  async getPendingChangeCount(ownerNodeNum: number): Promise<{
    config: number;
    moduleConfig: number;
    channel: number;
    total: number;
  }> {
    const pendingChanges =
      await configCacheRepo.getPendingChanges(ownerNodeNum);

    const configChanges = pendingChanges.filter(
      (c) => c.changeType === "config",
    );
    const moduleConfigChanges = pendingChanges.filter(
      (c) => c.changeType === "moduleConfig",
    );
    const channelChanges = pendingChanges.filter(
      (c) => c.changeType === "channel",
    );

    // Count unique variants (not individual field changes)
    const configVariants = new Set(configChanges.map((c) => c.variant));
    const moduleConfigVariants = new Set(
      moduleConfigChanges.map((c) => c.variant),
    );

    return {
      config: configVariants.size,
      moduleConfig: moduleConfigVariants.size,
      channel: channelChanges.length,
      total:
        configVariants.size + moduleConfigVariants.size + channelChanges.length,
    };
  }

  /**
   * Clear all pending changes from database
   */
  async clearPendingChanges(ownerNodeNum: number): Promise<void> {
    await configCacheRepo.clearAllLocalChanges(ownerNodeNum);
  }
}

export const adminCommands = new AdminCommandService();
