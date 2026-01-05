import type { Types } from "@meshtastic/core";
import type { Device } from "@state/device";
import { useDeviceStore } from "@state/index.ts";

/**
 * DeviceCommandService - Centralized service for sending commands to the connected device
 *
 * This singleton service provides a single point of access for all device communication,
 * eliminating the need to pass device references through component props.
 *
 * Usage:
 * - Components call deviceCommands.sendMessage(...) instead of device.connection.sendText(...)
 * - The service automatically uses the active device from the store
 * - Supports remote administration by checking remoteAdminTargetNode
 */
class DeviceCommandService {
  /**
   * Get the active device from the store
   */
  private getActiveDevice(): Device | undefined {
    const store = useDeviceStore.getState();
    return store.getDevice(store.activeDeviceId);
  }

  /**
   * Get the connection from the active device
   * Throws if not connected
   */
  private getConnection() {
    const device = this.getActiveDevice();
    if (!device?.connection) {
      throw new Error("Not connected to a device");
    }
    return device.connection;
  }

  /**
   * Check if connected to a device
   */
  isConnected(): boolean {
    const device = this.getActiveDevice();
    return !!device?.connection;
  }

  /**
   * Get the current myNodeNum
   */
  getMyNodeNum(): number {
    const device = this.getActiveDevice();
    return device?.hardware.myNodeNum ?? 0;
  }

  /**
   * Send a text message
   * @param message The message text
   * @param to Destination node number or "broadcast"
   * @param wantAck Whether to request acknowledgement
   * @param channel Channel number (undefined for DMs)
   */
  async sendText(
    message: string,
    to: number | "broadcast",
    wantAck = true,
    channel?: Types.ChannelNumber,
  ): Promise<number | undefined> {
    return this.getConnection().sendText(message, to, wantAck, channel);
  }

  /**
   * Send a waypoint
   */
  async sendWaypoint(
    waypoint: Parameters<
      ReturnType<typeof this.getConnection>["sendWaypoint"]
    >[0],
    to: number | "broadcast",
    channel: Types.ChannelNumber,
  ): Promise<number | undefined> {
    return this.getConnection().sendWaypoint(waypoint, to, channel);
  }

  /**
   * Request a traceroute to a node
   */
  async traceRoute(nodeNum: number): Promise<number | undefined> {
    return this.getConnection().traceRoute(nodeNum);
  }

  /**
   * Send a raw packet
   */
  async sendPacket(
    byteData: Uint8Array,
    portNum: number,
    destination: number | "self" | "broadcast",
    channel?: Types.ChannelNumber,
    wantAck?: boolean,
    wantResponse?: boolean,
  ): Promise<number | undefined> {
    return this.getConnection().sendPacket(
      byteData,
      portNum,
      destination,
      channel,
      wantAck,
      wantResponse,
    );
  }

  /**
   * Request position from a node
   */
  async requestPosition(nodeNum: number): Promise<number | undefined> {
    return this.getConnection().requestPosition(nodeNum);
  }
}

export const deviceCommands = new DeviceCommandService();
