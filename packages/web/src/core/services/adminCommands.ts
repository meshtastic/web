import { create, toBinary } from "@bufbuild/protobuf";
import { nodeRepo } from "@data/repositories";
import { Protobuf } from "@meshtastic/core";
import { useDeviceStore } from "@state/index.ts";
import logger from "./logger";

/**
 * AdminCommandService - Centralized service for sending admin messages to devices
 *
 * This singleton service provides a single point of access for all admin operations,
 * handling both the protobuf message sending and local database updates.
 *
 * Usage:
 * - Components call adminCommands.setFavoriteNode(...) instead of passing device around
 * - The service automatically uses the active device from the store
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
}

export const adminCommands = new AdminCommandService();
