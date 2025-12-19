import { create } from "@bufbuild/protobuf";
import type { Device } from "@core/stores/deviceStore";
import { nodeRepo } from "@data/index";
import { Protobuf } from "@meshtastic/core";

/**
 * AdminMessageService - Centralized service for sending admin messages to devices
 *
 * This service abstracts all admin message operations, ensuring consistent handling
 * of both the protobuf message sending and local database updates.
 *
 * Methods are organized into two categories:
 * 1. Immediate operations (send*) - Send admin message immediately
 * 2. Message creators (create*Message) - Create admin message for queueing
 */
export class AdminMessageService {
  // ==================== Message Creators (for queueing) ====================

  /**
   * Create a fixed position admin message for queueing
   */
  static createSetFixedPositionMessage(position: {
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
  static createRemoveFixedPositionMessage(): Protobuf.Admin.AdminMessage {
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
  static async sendQueuedMessages(
    connection: Pick<import("@meshtastic/core").MeshDevice, "sendPacket">,
    messages: Protobuf.Admin.AdminMessage[],
  ): Promise<void> {
    const { toBinary } = await import("@bufbuild/protobuf");

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

  // ==================== Immediate Operations ====================

  /**
   * Set or remove a node as favorite
   * Sends admin message to device AND updates local database
   */
  static async setFavoriteNode(
    device: Device,
    deviceId: number,
    nodeNum: number,
    isFavorite: boolean,
  ): Promise<void> {
    // Send admin message to device
    device.sendAdminMessage(
      create(Protobuf.Admin.AdminMessageSchema, {
        payloadVariant: {
          case: isFavorite ? "setFavoriteNode" : "removeFavoriteNode",
          value: nodeNum,
        },
      }),
    );

    // Update local database
    await nodeRepo.updateFavorite(deviceId, nodeNum, isFavorite);
  }

  /**
   * Set or remove a node as ignored
   * Sends admin message to device AND updates local database
   */
  static async setIgnoredNode(
    device: Device,
    deviceId: number,
    nodeNum: number,
    isIgnored: boolean,
  ): Promise<void> {
    // Send admin message to device
    device.sendAdminMessage(
      create(Protobuf.Admin.AdminMessageSchema, {
        payloadVariant: {
          case: isIgnored ? "setIgnoredNode" : "removeIgnoredNode",
          value: nodeNum,
        },
      }),
    );

    // Update local database
    await nodeRepo.updateIgnored(deviceId, nodeNum, isIgnored);
  }

  /**
   * Request device to reboot
   */
  static rebootDevice(device: Device, seconds = 5): void {
    device.sendAdminMessage(
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
  static shutdownDevice(device: Device, seconds = 5): void {
    device.sendAdminMessage(
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
  static factoryResetDevice(device: Device): void {
    device.sendAdminMessage(
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
  static resetNodeDb(device: Device): void {
    device.sendAdminMessage(
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
  static setFixedPosition(
    device: Device,
    position: {
      latitudeI: number;
      longitudeI: number;
      altitude?: number;
      time?: number;
    },
  ): void {
    device.sendAdminMessage(
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
  static removeFixedPosition(device: Device): void {
    device.sendAdminMessage(
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
  static setTime(device: Device): void {
    device.sendAdminMessage(
      create(Protobuf.Admin.AdminMessageSchema, {
        payloadVariant: {
          case: "setTimeOnly",
          value: Math.floor(Date.now() / 1000),
        },
      }),
    );
  }

  /**
   * Enter DFU mode for firmware updates
   */
  static enterDfuMode(device: Device): void {
    device.sendAdminMessage(
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
  static removeNode(device: Device, nodeNum: number): void {
    device.sendAdminMessage(
      create(Protobuf.Admin.AdminMessageSchema, {
        payloadVariant: {
          case: "removeByNodenum",
          value: nodeNum,
        },
      }),
    );
  }
}
