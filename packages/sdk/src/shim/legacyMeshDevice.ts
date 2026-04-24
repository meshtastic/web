/**
 * Phase-A compatibility shim.
 *
 * Provides a class with the same public surface as the legacy
 * `@meshtastic/core` `MeshDevice` so that existing consumers (including
 * `packages/web`) continue to build unchanged after swapping the package
 * import. Delegates all work to the new `MeshClient` and its feature slices.
 *
 * Removed in Phase C once `packages/web` has migrated to the feature clients.
 */

import { create, toBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import type { Logger } from "tslog";
import { MeshClient } from "../core/client/MeshClient.ts";
import type { EventBus } from "../core/event-bus/EventBus.ts";
import type { Queue } from "../core/queue/Queue.ts";
import type { Transport } from "../core/transport/Transport.ts";
import { DeviceStatusEnum } from "../core/transport/Transport.ts";
import { ChannelNumber, type Destination, Emitter, type PacketMetadata } from "../core/types.ts";
import type { Xmodem } from "../core/xmodem/Xmodem.ts";
import { sendAdminMessage } from "../features/device/infrastructure/AdminMessageSender.ts";

export class MeshDevice {
  private readonly client: MeshClient;

  public transport: Transport;
  public log: Logger<unknown>;
  public events: EventBus;
  public queue: Queue;
  public xModem: Xmodem;
  public configId: number;

  protected deviceStatus: DeviceStatusEnum;
  protected isConfigured: boolean;
  protected pendingSettingsChanges: boolean;
  private myNodeInfo: Protobuf.Mesh.MyNodeInfo;

  constructor(transport: Transport, configId?: number) {
    this.client = new MeshClient({ transport, configId });
    this.transport = this.client.transport;
    this.log = this.client.log;
    this.events = this.client.events;
    this.queue = this.client.queue;
    this.xModem = this.client.xModem;
    this.configId = this.client.configId;
    this.deviceStatus = DeviceStatusEnum.DeviceDisconnected;
    this.isConfigured = false;
    this.pendingSettingsChanges = false;
    this.myNodeInfo = create(Protobuf.Mesh.MyNodeInfoSchema);

    this.client.events.onDeviceStatus.subscribe((status) => {
      this.deviceStatus = status;
      if (status === DeviceStatusEnum.DeviceConfigured) this.isConfigured = true;
      else if (status === DeviceStatusEnum.DeviceConfiguring) this.isConfigured = false;
    });
    this.client.events.onMyNodeInfo.subscribe((info) => {
      this.myNodeInfo = info;
    });
    this.client.events.onPendingSettingsChange.subscribe((pending) => {
      this.pendingSettingsChanges = pending;
    });
  }

  public updateDeviceStatus(status: DeviceStatusEnum): void {
    this.client.updateDeviceStatus(status);
  }

  public configure(): Promise<number> {
    return this.client.configure();
  }

  public heartbeat(): Promise<number> {
    return this.client.heartbeat();
  }

  public setHeartbeatInterval(interval: number): void {
    this.client.setHeartbeatInterval(interval);
  }

  public complete(): void {
    this.client.complete();
  }

  public disconnect(): Promise<void> {
    return this.client.disconnect();
  }

  public sendPacket(
    byteData: Uint8Array,
    portNum: Protobuf.Portnums.PortNum,
    destination: Destination,
    channel: ChannelNumber = ChannelNumber.Primary,
    wantAck = true,
    wantResponse = true,
    echoResponse = false,
    replyId?: number,
    emoji?: number,
  ): Promise<number> {
    return this.client.sendPacket(
      byteData,
      portNum,
      destination,
      channel,
      wantAck,
      wantResponse,
      echoResponse,
      replyId,
      emoji,
    );
  }

  public sendRaw(toRadio: Uint8Array, id?: number): Promise<number> {
    return this.client.sendRaw(toRadio, id);
  }

  public async sendText(
    text: string,
    destination?: Destination,
    wantAck?: boolean,
    channel?: ChannelNumber,
    replyId?: number,
    emoji?: number,
  ): Promise<number> {
    this.log.debug(
      Emitter[Emitter.SendText],
      `📤 Sending message to ${destination ?? "broadcast"} on channel ${channel?.toString() ?? 0}`,
    );
    return this.client.sendPacket(
      new TextEncoder().encode(text),
      Protobuf.Portnums.PortNum.TEXT_MESSAGE_APP,
      destination ?? "broadcast",
      channel,
      wantAck,
      false,
      true,
      replyId,
      emoji,
    );
  }

  public sendWaypoint(
    waypointMessage: Protobuf.Mesh.Waypoint,
    destination: Destination,
    channel?: ChannelNumber,
  ): Promise<number> {
    waypointMessage.id = Math.floor(Math.random() * 1e9);
    return this.client.sendPacket(
      toBinary(Protobuf.Mesh.WaypointSchema, waypointMessage),
      Protobuf.Portnums.PortNum.WAYPOINT_APP,
      destination,
      channel,
      true,
      false,
    );
  }

  public setConfig(config: Protobuf.Config.Config): Promise<number> {
    return sendAdminMessage(this.client, { case: "setConfig", value: config });
  }

  public setModuleConfig(config: Protobuf.ModuleConfig.ModuleConfig): Promise<number> {
    return sendAdminMessage(this.client, { case: "setModuleConfig", value: config });
  }

  public setCannedMessages(
    messages: Protobuf.CannedMessages.CannedMessageModuleConfig,
  ): Promise<number> {
    return sendAdminMessage(this.client, {
      case: "setCannedMessageModuleMessages",
      value: messages.messages,
    });
  }

  public setOwner(owner: Protobuf.Mesh.User): Promise<number> {
    return sendAdminMessage(this.client, { case: "setOwner", value: owner });
  }

  public setChannel(channel: Protobuf.Channel.Channel): Promise<number> {
    return sendAdminMessage(this.client, { case: "setChannel", value: channel });
  }

  public enterDfuMode(): Promise<number> {
    return sendAdminMessage(this.client, { case: "enterDfuModeRequest", value: true });
  }

  public setPosition(position: Protobuf.Mesh.Position): Promise<number> {
    return this.client.sendPacket(
      toBinary(Protobuf.Mesh.PositionSchema, position),
      Protobuf.Portnums.PortNum.POSITION_APP,
      "self",
    );
  }

  public setFixedPosition(latitude: number, longitude: number): Promise<number> {
    const position = create(Protobuf.Mesh.PositionSchema, {
      latitudeI: Math.floor(latitude / 1e-7),
      longitudeI: Math.floor(longitude / 1e-7),
    });
    return sendAdminMessage(
      this.client,
      { case: "setFixedPosition", value: position },
      "self",
      undefined,
      true,
      false,
    );
  }

  public removeFixedPosition(): Promise<number> {
    return sendAdminMessage(
      this.client,
      { case: "removeFixedPosition", value: true },
      "self",
      undefined,
      true,
      false,
    );
  }

  public getChannel(index: number): Promise<number> {
    return sendAdminMessage(this.client, { case: "getChannelRequest", value: index + 1 });
  }

  public getConfig(type: Protobuf.Admin.AdminMessage_ConfigType): Promise<number> {
    return sendAdminMessage(this.client, { case: "getConfigRequest", value: type });
  }

  public getModuleConfig(type: Protobuf.Admin.AdminMessage_ModuleConfigType): Promise<number> {
    return sendAdminMessage(this.client, { case: "getModuleConfigRequest", value: type });
  }

  public getOwner(): Promise<number> {
    return sendAdminMessage(this.client, { case: "getOwnerRequest", value: true });
  }

  public getMetadata(nodeNum: number): Promise<number> {
    return sendAdminMessage(
      this.client,
      { case: "getDeviceMetadataRequest", value: true },
      nodeNum,
      ChannelNumber.Admin,
    );
  }

  public clearChannel(index: number): Promise<number> {
    const channel = create(Protobuf.Channel.ChannelSchema, {
      index,
      role: Protobuf.Channel.Channel_Role.DISABLED,
    });
    return sendAdminMessage(this.client, { case: "setChannel", value: channel });
  }

  public commitEditSettings(): Promise<number> {
    this.events.onPendingSettingsChange.dispatch(false);
    return sendAdminMessage(this.client, { case: "commitEditSettings", value: true });
  }

  public resetNodes(): Promise<number> {
    return sendAdminMessage(this.client, { case: "nodedbReset", value: true });
  }

  public removeNodeByNum(nodeNum: number): Promise<number> {
    return sendAdminMessage(this.client, { case: "removeByNodenum", value: nodeNum });
  }

  public shutdown(time: number): Promise<number> {
    return sendAdminMessage(this.client, { case: "shutdownSeconds", value: time });
  }

  public reboot(time: number): Promise<number> {
    return sendAdminMessage(this.client, { case: "rebootSeconds", value: time });
  }

  public rebootOta(time: number): Promise<number> {
    return sendAdminMessage(this.client, { case: "rebootOtaSeconds", value: time });
  }

  public factoryResetDevice(): Promise<number> {
    return sendAdminMessage(this.client, { case: "factoryResetDevice", value: 1 });
  }

  public factoryResetConfig(): Promise<number> {
    return sendAdminMessage(this.client, { case: "factoryResetConfig", value: 1 });
  }

  public traceRoute(destination: number): Promise<number> {
    const discovery = create(Protobuf.Mesh.RouteDiscoverySchema, { route: [] });
    return this.client.sendPacket(
      toBinary(Protobuf.Mesh.RouteDiscoverySchema, discovery),
      Protobuf.Portnums.PortNum.TRACEROUTE_APP,
      destination,
    );
  }

  public requestPosition(destination: number): Promise<number> {
    return this.client.sendPacket(
      new Uint8Array(),
      Protobuf.Portnums.PortNum.POSITION_APP,
      destination,
    );
  }

  /** Exposed for callers that still reach into internals (e.g. packet-codec). */
  public handleMeshPacket(_packet: Protobuf.Mesh.MeshPacket): void {
    // Packet routing now lives in the core packet-codec. Intentionally a no-op
    // on the shim — the underlying MeshClient has already wired decode events.
  }

  /** Metadata accessor (previously `this.myNodeInfo`). */
  public getMyNodeInfo(): Protobuf.Mesh.MyNodeInfo {
    return this.myNodeInfo;
  }

  /** Exposes an optimistic packet echo (was called by sendPacket echoResponse). */
  public echoLocalPacket<T>(metadata: Omit<PacketMetadata<T>, "data">, data: T): void {
    void metadata;
    void data;
  }
}
