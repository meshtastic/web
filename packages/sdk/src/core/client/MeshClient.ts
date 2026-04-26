import { create, toBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import type { Logger } from "tslog";
import { Constants } from "../constants/index.ts";
import { EventBus } from "../event-bus/EventBus.ts";
import { PacketTooLargeError } from "../errors/MeshError.ts";
import { generatePacketId } from "../identifiers/PacketId.ts";
import { createLogger } from "../logging/logger.ts";
import { decodePacket } from "../packet-codec/decodePacket.ts";
import { Queue } from "../queue/Queue.ts";
import type { Transport } from "../transport/Transport.ts";
import { DeviceStatusEnum } from "../transport/Transport.ts";
import { ChannelNumber, type Destination, Emitter, type PacketMetadata } from "../types.ts";
import { Xmodem } from "../xmodem/Xmodem.ts";
import { ChatClient } from "../../features/chat/index.ts";
import { ChannelsClient } from "../../features/channels/index.ts";
import { ConfigClient } from "../../features/config/index.ts";
import { DeviceClient } from "../../features/device/index.ts";
import { FilesClient } from "../../features/files/index.ts";
import { NodesClient } from "../../features/nodes/index.ts";
import { PositionClient } from "../../features/position/index.ts";
import { TelemetryClient } from "../../features/telemetry/index.ts";
import type { TelemetryClientOptions } from "../../features/telemetry/index.ts";
import { TraceRouteClient } from "../../features/traceroute/index.ts";

import type { ChatClientOptions } from "../../features/chat/ChatClient.ts";
import type { NodesClientOptions } from "../../features/nodes/NodesClient.ts";

export interface MeshClientOptions {
  transport: Transport;
  configId?: number;
  logger?: Logger<unknown>;
  chat?: ChatClientOptions;
  nodes?: NodesClientOptions;
  telemetry?: TelemetryClientOptions;
}

/**
 * Orchestrator for a single connected Meshtastic device.
 *
 * Owns the transport, event bus, queue, and xmodem instances. Exposes one
 * client per feature slice; slice clients consume events from the bus and
 * publish signal-backed state that UI layers subscribe to.
 */
export class MeshClient {
  public readonly log: Logger<unknown>;
  public readonly transport: Transport;
  public readonly events: EventBus;
  public readonly queue: Queue;
  public readonly xModem: Xmodem;
  public configId: number;

  public readonly device: DeviceClient;
  public readonly chat: ChatClient;
  public readonly nodes: NodesClient;
  public readonly channels: ChannelsClient;
  public readonly config: ConfigClient;
  public readonly telemetry: TelemetryClient;
  public readonly position: PositionClient;
  public readonly traceroute: TraceRouteClient;
  public readonly files: FilesClient;

  private _heartbeatIntervalId: ReturnType<typeof setInterval> | undefined;

  constructor(options: MeshClientOptions) {
    this.log = options.logger ?? createLogger("MeshClient");
    this.transport = options.transport;
    this.events = new EventBus();
    this.queue = new Queue();
    this.xModem = new Xmodem(this.sendRaw.bind(this));
    this.configId = options.configId ?? generatePacketId();

    this.device = new DeviceClient(this);
    this.chat = new ChatClient(this, options.chat);
    this.nodes = new NodesClient(this, options.nodes);
    this.channels = new ChannelsClient(this);
    this.config = new ConfigClient(this);
    this.telemetry = new TelemetryClient(this, options.telemetry);
    this.position = new PositionClient(this);
    this.traceroute = new TraceRouteClient(this);
    this.files = new FilesClient(this);

    this.events.onDeviceStatus.subscribe((status) => {
      if (status === DeviceStatusEnum.DeviceDisconnected) {
        if (this._heartbeatIntervalId !== undefined) {
          clearInterval(this._heartbeatIntervalId);
        }
        this.complete();
      }
    });

    this.transport.fromDevice.pipeTo(decodePacket(this));
  }

  public get myNodeNum(): number {
    return this.device.myNodeNum.value ?? 0;
  }

  /**
   * Begin the wantConfigId → config-complete handshake. Resolves when the
   * device has ack'd the wantConfigId packet (status changes to
   * DeviceConfigured when the device finishes sending its configuration).
   */
  public async connect(): Promise<void> {
    this.updateDeviceStatus(DeviceStatusEnum.DeviceConnecting);
    await this.configure();
  }

  public configure(): Promise<number> {
    this.log.debug(Emitter[Emitter.Configure], "⚙️ Requesting device configuration");
    this.updateDeviceStatus(DeviceStatusEnum.DeviceConfiguring);

    const toRadio = create(Protobuf.Mesh.ToRadioSchema, {
      payloadVariant: { case: "wantConfigId", value: this.configId },
    });

    return this.sendRaw(toBinary(Protobuf.Mesh.ToRadioSchema, toRadio)).catch((e) => {
      if (this.device.status.value === DeviceStatusEnum.DeviceDisconnected) {
        throw new Error("Device connection lost");
      }
      throw e;
    });
  }

  public heartbeat(): Promise<number> {
    this.log.debug(Emitter[Emitter.Ping], "❤️ Send heartbeat ping to radio");
    const toRadio = create(Protobuf.Mesh.ToRadioSchema, {
      payloadVariant: { case: "heartbeat", value: {} },
    });
    return this.sendRaw(toBinary(Protobuf.Mesh.ToRadioSchema, toRadio));
  }

  public setHeartbeatInterval(interval: number): void {
    if (this._heartbeatIntervalId !== undefined) {
      clearInterval(this._heartbeatIntervalId);
    }
    this._heartbeatIntervalId = setInterval(() => {
      this.heartbeat().catch((err: Error) => {
        this.log.error(Emitter[Emitter.Ping], `⚠️ Unable to send heartbeat: ${err.message}`);
      });
    }, interval);
  }

  public updateDeviceStatus(status: DeviceStatusEnum): void {
    if (status !== this.device.status.value) {
      this.events.onDeviceStatus.dispatch(status);
    }
  }

  /**
   * Low-level send: wraps an arbitrary payload in a MeshPacket → ToRadio and
   * returns the ack promise from the queue. Feature slices delegate here.
   */
  public async sendPacket(
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
    this.log.trace(
      Emitter[Emitter.SendPacket],
      `📤 Sending ${Protobuf.Portnums.PortNum[portNum]} to ${destination}`,
    );

    const myNum = this.myNodeNum;
    const meshPacket = create(Protobuf.Mesh.MeshPacketSchema, {
      payloadVariant: {
        case: "decoded",
        value: {
          payload: byteData,
          portnum: portNum,
          wantResponse,
          emoji,
          replyId,
          dest: 0,
          requestId: 0,
          source: 0,
        },
      },
      from: myNum,
      to:
        destination === "broadcast"
          ? Constants.broadcastNum
          : destination === "self"
            ? myNum
            : destination,
      id: generatePacketId(),
      wantAck,
      channel,
    });

    const toRadioMessage = create(Protobuf.Mesh.ToRadioSchema, {
      payloadVariant: { case: "packet", value: meshPacket },
    });

    if (echoResponse) {
      meshPacket.rxTime = Math.trunc(Date.now() / 1000);
      this.events.onMeshPacket.dispatch(meshPacket);
    }
    return await this.sendRaw(toBinary(Protobuf.Mesh.ToRadioSchema, toRadioMessage), meshPacket.id);
  }

  public async sendRaw(toRadio: Uint8Array, id: number = generatePacketId()): Promise<number> {
    if (toRadio.length > 512) {
      throw new PacketTooLargeError(toRadio.length);
    }
    this.queue.push({ id, data: toRadio });
    await this.queue.processQueue(this.transport.toDevice);
    return this.queue.wait(id);
  }

  /**
   * Dispatch a `PacketMetadata` echo for locally-composed messages.
   */
  public echoLocalMessage<T>(
    portnum: Protobuf.Portnums.PortNum,
    data: T,
    metadata: Omit<PacketMetadata<T>, "data">,
  ): void {
    // Reserved for use-cases that need to optimistically reflect outbound into stores.
    // Slice use-cases may call bus dispatchers directly; provided here for symmetry.
    void portnum;
    void data;
    void metadata;
  }

  public complete(): void {
    this.queue.clear();
  }

  public async disconnect(): Promise<void> {
    this.log.debug(Emitter[Emitter.Disconnect], "🔌 Disconnecting from device");
    if (this._heartbeatIntervalId !== undefined) {
      clearInterval(this._heartbeatIntervalId);
    }
    this.complete();
    await this.transport.toDevice.close();
    await this.transport.disconnect();
    this.updateDeviceStatus(DeviceStatusEnum.DeviceDisconnected);
  }
}
