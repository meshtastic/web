import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { createLogger } from "@core/log.ts";
import { Protobuf, Types } from "@core/protobuf.ts";
import type {
  DraftRepository,
  MessageRepository,
  NodesRepository,
  RetentionPolicy,
  TelemetryRepository,
  TelemetryRetentionPolicy,
} from "@core/storage/types.ts";
import type {
  AdminResultJs,
  ConnectionStateJs,
  MeshtasticClient,
  SendOutcomeJs,
} from "@meshtastic/sdk-kmp";
import { signal } from "@preact/signals-core";
import { Result } from "better-result";
import {
  adminMessage,
  type AdminVariant,
  encodeAdminMessage,
  getText,
  sendAdmin,
  toResult,
} from "./admin.ts";
import { ChannelsClient } from "./channels.ts";
import { ChatClient } from "./chat.ts";
import { DeviceClient } from "./device.ts";
import { Emitter } from "./emitter.ts";
import { NodesClient } from "./nodes.ts";
import {
  decodeFromRadio,
  decodeMeshPacket,
  encodeOutbound,
  type OutboundPacket,
  packetMetadata,
  withData,
} from "./packets.ts";
import { type ReadonlySignal, toReadonly } from "./signals.ts";
import { TelemetryClient } from "./telemetry.ts";

const log = createLogger("session");

export interface ConnectionProgressCounters {
  config: number;
  modules: number;
  channels: number;
  nodes: number;
  myInfo: boolean;
  metadata: boolean;
}

export type ConnectionProgress =
  | { phase: "idle" }
  | { phase: "configuring"; received: ConnectionProgressCounters }
  | { phase: "configured"; received: ConnectionProgressCounters };

const EMPTY_COUNTERS: ConnectionProgressCounters = {
  config: 0,
  modules: 0,
  channels: 0,
  nodes: 0,
  myInfo: false,
  metadata: false,
};

export interface SessionOptions {
  messages?: MessageRepository;
  drafts?: DraftRepository;
  nodes?: NodesRepository;
  telemetry?: TelemetryRepository;
  chatRetention?: RetentionPolicy;
  telemetryRetention?: TelemetryRetentionPolicy;
}

type Packet<T> = Types.PacketMetadata<T>;

/**
 * Everything the web reads from one radio, built on the Kotlin SDK facade:
 * the decoded FromRadio and MeshPacket streams as typed events, and the
 * device, nodes, channels, chat and telemetry views over them. The SDK
 * owns the connection, handshake and node DB; this owns what the SDK does
 * not keep (messages, drafts, telemetry history, per-node errors) and the
 * web's view of the rest.
 */
export class MeshSession {
  readonly events = {
    onFromRadio: new Emitter<Protobuf.Mesh.FromRadio>(),
    onMeshPacket: new Emitter<Protobuf.Mesh.MeshPacket>(),
    onMessagePacket: new Emitter<Packet<string>>(),
    onRoutingPacket: new Emitter<Packet<Protobuf.Mesh.Routing>>(),
    onPositionPacket: new Emitter<Packet<Protobuf.Mesh.Position>>(),
    onUserPacket: new Emitter<Packet<Protobuf.Mesh.User>>(),
    onTelemetryPacket: new Emitter<Packet<Protobuf.Telemetry.Telemetry>>(),
    onTraceRoutePacket: new Emitter<Packet<Protobuf.Mesh.RouteDiscovery>>(),
    onWaypointPacket: new Emitter<Packet<Protobuf.Mesh.Waypoint>>(),
    onNeighborInfoPacket: new Emitter<Packet<Protobuf.Mesh.NeighborInfo>>(),
    onAdminPacket: new Emitter<Packet<Protobuf.Admin.AdminMessage>>(),
    onNodeStatusPacket: new Emitter<Packet<Protobuf.Mesh.StatusMessage>>(),
    onMeshBeaconPacket: new Emitter<Packet<Protobuf.MeshBeacon.MeshBeacon>>(),
    onClientNotificationPacket: new Emitter<Protobuf.Mesh.ClientNotification>(),
    onDeviceMetadataPacket: new Emitter<{
      from: number;
      data: Protobuf.Mesh.DeviceMetadata;
    }>(),
    onMyNodeInfo: new Emitter<Protobuf.Mesh.MyNodeInfo>(),
    onNodeInfoPacket: new Emitter<Protobuf.Mesh.NodeInfo>(),
    onConfigPacket: new Emitter<Protobuf.Config.Config>(),
    onModuleConfigPacket: new Emitter<Protobuf.ModuleConfig.ModuleConfig>(),
    onChannelPacket: new Emitter<Protobuf.Channel.Channel>(),
    onLockdownStatus: new Emitter<Protobuf.Mesh.LockdownStatus>(),
    onRegionPresets: new Emitter<Protobuf.Mesh.LoRaRegionPresetMap>(),
    onLogRecord: new Emitter<Protobuf.Mesh.LogRecord>(),
    onRebooted: new Emitter<void>(),
    onConnectionState: new Emitter<ConnectionStateJs>(),
    onDeviceStatus: new Emitter<Types.DeviceStatusEnum>(),
    onPendingSettingsChange: new Emitter<boolean>(),
  };

  readonly device: DeviceClient;
  readonly nodes: NodesClient;
  readonly channels: ChannelsClient;
  readonly chat: ChatClient;
  readonly telemetry: TelemetryClient;
  readonly config: {
    readonly isRegionUnset: ReadonlySignal<boolean>;
    requestCannedMessages(): Promise<Result<string, Error>>;
    requestRingtone(): Promise<Result<string, Error>>;
  };
  readonly progress: ReadonlySignal<ConnectionProgress>;
  readonly log = log;

  private readonly progressStore = signal<ConnectionProgress>({
    phase: "idle",
  });
  private readonly regionUnset = signal(false);
  private readonly unsubscribes: Array<() => void> = [];
  private closed = false;
  private rehandshaking: Promise<void> | undefined;
  private cycling = false;

  constructor(
    readonly kmp: MeshtasticClient,
    options: SessionOptions = {},
  ) {
    const admin = {
      sendAdmin: (variant: AdminVariant) => this.sendAdmin(variant),
      firmwareVersion: () => this.device.metadata.peek()?.firmwareVersion,
      myNodeNum: () => this.device.myNodeNum.peek(),
      rehandshake: () => this.rehandshake(),
      warn: (message: string, ...args: unknown[]) => log.warn(message, ...args),
    };
    this.device = new DeviceClient(admin);
    this.nodes = new NodesClient(admin, options.nodes);
    this.channels = new ChannelsClient(() => this.device.myNodeNum.peek());
    this.chat = new ChatClient(
      {
        myNodeNum: () => this.myNodeNum,
        sendText: (text, to, channel, replyId) =>
          kmp.sendText(text, to, channel, replyId),
        warn: admin.warn,
      },
      {
        repository: options.messages,
        draftRepository: options.drafts,
        retention: options.chatRetention,
      },
    );
    this.telemetry = new TelemetryClient({
      repository: options.telemetry,
      retention: options.telemetryRetention,
    });
    this.config = {
      isRegionUnset: toReadonly(this.regionUnset),
      requestCannedMessages: () =>
        getText(kmp, {
          case: "getCannedMessageModuleMessagesRequest",
          value: true,
        }),
      requestRingtone: () =>
        getText(kmp, { case: "getRingtoneRequest", value: true }),
    };
    this.progress = toReadonly(this.progressStore);

    this.events.onPendingSettingsChange.subscribe((pending) =>
      this.device.setPendingSettingsChanges(pending),
    );
    this.unsubscribes.push(
      kmp.onConnectionState((state) => this.handleConnectionState(state)),
      kmp.onFromRadio((bytes) => this.handleFromRadio(bytes)),
      kmp.onPacket((bytes) => this.handlePacket(bytes)),
      kmp.onNodeChange((change) => this.nodes.applyChange(change)),
    );
  }

  /** The local node number, or 0 before the handshake names it. */
  get myNodeNum(): number {
    return this.device.myNodeNum.peek() ?? this.kmp.myNodeNum ?? 0;
  }

  sendAdmin(
    variant: AdminVariant,
    dest?: number,
  ): Promise<Result<AdminResultJs, Error>> {
    return sendAdmin(this.kmp, variant, dest);
  }

  sendPacket(packet: OutboundPacket): Promise<SendOutcomeJs> {
    return this.kmp.sendPacket(encodeOutbound(packet, this.myNodeNum)).outcome;
  }

  sendWaypoint(
    waypoint: Protobuf.Mesh.Waypoint,
    destination: Types.Destination,
    channel: Types.ChannelNumber = 0,
  ): Promise<SendOutcomeJs> {
    return this.sendPacket({
      payload: toBinary(Protobuf.Mesh.WaypointSchema, waypoint),
      portNum: Protobuf.Portnums.PortNum.WAYPOINT_APP,
      destination,
      channel,
    });
  }

  requestPosition(nodeNum: number): Promise<SendOutcomeJs> {
    return this.kmp.requestPosition(nodeNum).outcome;
  }

  async traceRoute(
    nodeNum: number,
  ): Promise<Result<Protobuf.Mesh.RouteDiscovery, Error>> {
    const result = toResult(await this.kmp.traceRoute(nodeNum));
    if (Result.isError(result)) return Result.err(result.error);
    const bytes = result.value.value;
    return bytes
      ? Result.ok(fromBinary(Protobuf.Mesh.RouteDiscoverySchema, bytes))
      : Result.err(new Error("empty-response"));
  }

  sendKeyVerification(
    messageType: Protobuf.Admin.KeyVerificationAdmin_MessageType,
    remoteNodenum: number,
    nonce: bigint,
    securityNumber?: number,
  ): Promise<Result<AdminResultJs, Error>> {
    return this.sendAdmin({
      case: "keyVerification",
      value: create(Protobuf.Admin.KeyVerificationAdminSchema, {
        messageType,
        remoteNodenum,
        nonce,
        securityNumber,
      }),
    });
  }

  private async adminOrThrow(variant: AdminVariant): Promise<void> {
    const result = await this.sendAdmin(variant);
    if (Result.isError(result)) throw result.error;
  }

  reboot(seconds = 0): Promise<void> {
    return this.adminOrThrow({ case: "rebootSeconds", value: seconds });
  }

  rebootOta(seconds = 0): Promise<void> {
    return this.adminOrThrow({ case: "rebootOtaSeconds", value: seconds });
  }

  shutdown(seconds = 0): Promise<void> {
    return this.adminOrThrow({ case: "shutdownSeconds", value: seconds });
  }

  enterDfuMode(): Promise<void> {
    return this.adminOrThrow({ case: "enterDfuModeRequest", value: true });
  }

  factoryResetDevice(): Promise<void> {
    return this.adminOrThrow({ case: "factoryResetDevice", value: 1 });
  }

  /** The SDK's AdminApi has no config-only reset, so this goes out as a raw admin packet. */
  async factoryResetConfig(): Promise<void> {
    const outcome = await this.sendPacket({
      payload: encodeAdminMessage(
        adminMessage({ case: "factoryResetConfig", value: 1 }),
      ),
      portNum: Protobuf.Portnums.PortNum.ADMIN_APP,
      destination: "self",
      wantAck: true,
    });
    if (!outcome.ok) throw new Error(outcome.reason ?? "factory reset failed");
  }

  /**
   * Runs the handshake again by cycling the SDK connection. A session
   * closed while the cycle is under way stays disconnected.
   */
  rehandshake(): Promise<void> {
    this.rehandshaking ??= this.cycleConnection();
    return this.rehandshaking;
  }

  private async cycleConnection(): Promise<void> {
    this.cycling = true;
    try {
      await this.kmp.disconnect();
      if (!this.closed) await this.kmp.connect();
    } finally {
      this.cycling = false;
      this.rehandshaking = undefined;
    }
  }

  /** True while `rehandshake` is cycling the SDK connection. */
  get isRehandshaking(): boolean {
    return this.cycling;
  }

  /** Disconnects the SDK client once any handshake cycle has settled. */
  async disconnect(): Promise<void> {
    await this.rehandshaking?.catch(() => {});
    await this.kmp.disconnect();
  }

  /** Stops feeding the session; the SDK client is left to its owner. */
  close(): void {
    this.closed = true;
    for (const off of this.unsubscribes.splice(0)) off();
  }

  /** Points message, node and telemetry history at `nodeNum`'s. */
  rescope(nodeNum: number): void {
    this.chat.rescope(nodeNum);
    this.nodes.rescope(nodeNum);
    this.telemetry.rescope(nodeNum);
  }

  private handleConnectionState(state: ConnectionStateJs): void {
    this.device.applyConnectionState(state);
    this.events.onConnectionState.dispatch(state);
    this.events.onDeviceStatus.dispatch(this.device.status.peek());
    switch (state.kind) {
      case "connecting":
      case "reconnecting":
        this.progressStore.value = { phase: "idle" };
        return;
      case "configuring":
        if (this.progressStore.peek().phase !== "configuring") {
          this.progressStore.value = {
            phase: "configuring",
            received: { ...EMPTY_COUNTERS },
          };
        }
        return;
      case "connected": {
        const current = this.progressStore.peek();
        this.progressStore.value = {
          phase: "configured",
          received:
            current.phase === "idle" ? { ...EMPTY_COUNTERS } : current.received,
        };
        this.adoptSdkIdentity();
        return;
      }
      default:
        this.progressStore.value = { phase: "idle" };
    }
  }

  private bump(field: keyof ConnectionProgressCounters): void {
    const current = this.progressStore.peek();
    const received =
      current.phase === "idle" ? { ...EMPTY_COUNTERS } : current.received;
    const value = received[field];
    this.progressStore.value = {
      phase: current.phase === "configured" ? "configured" : "configuring",
      received: {
        ...received,
        [field]: typeof value === "number" ? value + 1 : true,
      },
    };
  }

  /**
   * The SDK keeps the handshake's own-node state itself; a `my_info` or own
   * `node_info` frame the web failed to decode must not leave the session
   * without its node.
   */
  private adoptSdkIdentity(): void {
    const myNodeNum = this.kmp.myNodeNum;
    if (!myNodeNum || myNodeNum <= 0) return;
    this.device.applyMyNodeNum(myNodeNum);
    if (this.nodes.byNum(myNodeNum)) return;
    const own = this.kmp.ownNode;
    if (own) {
      this.nodes.applyChange({
        kind: "added",
        node: own,
        nodes: null,
        nodeNum: myNodeNum,
      });
    }
  }

  private handleFromRadio(bytes: Uint8Array): void {
    let frame: Protobuf.Mesh.FromRadio;
    try {
      frame = decodeFromRadio(bytes);
    } catch (e) {
      log.debug("undecodable FromRadio frame", e);
      return;
    }
    this.events.onFromRadio.dispatch(frame);
    const variant = frame.payloadVariant;
    switch (variant.case) {
      case "myInfo":
        this.bump("myInfo");
        this.device.applyMyNodeInfo(variant.value);
        this.chat.refileSentDirect(variant.value.myNodeNum);
        this.events.onMyNodeInfo.dispatch(variant.value);
        return;
      case "metadata":
        this.bump("metadata");
        this.device.applyMetadata(variant.value);
        this.events.onDeviceMetadataPacket.dispatch({
          from: 0,
          data: variant.value,
        });
        return;
      case "nodeInfo":
        this.bump("nodes");
        this.events.onNodeInfoPacket.dispatch(variant.value);
        return;
      case "config":
        this.bump("config");
        if (variant.value.payloadVariant.case === "lora") {
          this.regionUnset.value =
            variant.value.payloadVariant.value.region ===
            Protobuf.Config.Config_LoRaConfig_RegionCode.UNSET;
        }
        this.events.onConfigPacket.dispatch(variant.value);
        return;
      case "moduleConfig":
        this.bump("modules");
        this.events.onModuleConfigPacket.dispatch(variant.value);
        return;
      case "channel":
        this.bump("channels");
        this.channels.applyChannel(variant.value);
        this.events.onChannelPacket.dispatch(variant.value);
        return;
      case "clientNotification":
        this.events.onClientNotificationPacket.dispatch(variant.value);
        return;
      case "lockdownStatus":
        this.device.applyLockdownStatus(variant.value);
        this.events.onLockdownStatus.dispatch(variant.value);
        return;
      case "regionPresets":
        this.device.applyRegionPresets(variant.value);
        this.events.onRegionPresets.dispatch(variant.value);
        return;
      case "logRecord":
        this.events.onLogRecord.dispatch(variant.value);
        return;
      case "rebooted":
        if (variant.value) this.events.onRebooted.dispatch();
        return;
      default:
        return;
    }
  }

  private handlePacket(bytes: Uint8Array): void {
    let packet: Protobuf.Mesh.MeshPacket;
    try {
      packet = decodeMeshPacket(bytes);
    } catch (e) {
      log.warn("undecodable MeshPacket", e);
      return;
    }
    this.events.onMeshPacket.dispatch(packet);
    this.nodes.heard(packet);
    if (packet.payloadVariant.case !== "decoded") return;
    const data = packet.payloadVariant.value;
    const meta = packetMetadata(packet, data);
    const PortNum = Protobuf.Portnums.PortNum;
    try {
      switch (data.portnum) {
        case PortNum.TEXT_MESSAGE_APP: {
          const text = withData(meta, new TextDecoder().decode(data.payload));
          this.chat.receive(text);
          this.events.onMessagePacket.dispatch(text);
          return;
        }
        case PortNum.ROUTING_APP: {
          const routing = fromBinary(Protobuf.Mesh.RoutingSchema, data.payload);
          if (routing.variant.case === "errorReason") {
            this.chat.applyAck(
              meta.requestId ?? meta.id,
              meta.from,
              routing.variant.value,
              meta.ackProofStatus,
            );
            if (routing.variant.value !== Protobuf.Mesh.Routing_Error.NONE) {
              this.nodes.routingError(meta.from, routing.variant.value);
            }
          }
          this.events.onRoutingPacket.dispatch(withData(meta, routing));
          return;
        }
        case PortNum.POSITION_APP: {
          const position = fromBinary(
            Protobuf.Mesh.PositionSchema,
            data.payload,
          );
          this.nodes.patch(meta.from, { position });
          this.events.onPositionPacket.dispatch(withData(meta, position));
          return;
        }
        case PortNum.NODEINFO_APP: {
          const user = fromBinary(Protobuf.Mesh.UserSchema, data.payload);
          this.nodes.patch(meta.from, { user });
          this.events.onUserPacket.dispatch(withData(meta, user));
          return;
        }
        case PortNum.TELEMETRY_APP: {
          const telemetry = fromBinary(
            Protobuf.Telemetry.TelemetrySchema,
            data.payload,
          );
          if (telemetry.variant.case === "deviceMetrics") {
            this.nodes.patch(meta.from, {
              deviceMetrics: telemetry.variant.value,
            });
          }
          const reading = withData(meta, telemetry);
          this.telemetry.receive(reading);
          this.events.onTelemetryPacket.dispatch(reading);
          return;
        }
        case PortNum.TRACEROUTE_APP:
          this.events.onTraceRoutePacket.dispatch(
            withData(
              meta,
              fromBinary(Protobuf.Mesh.RouteDiscoverySchema, data.payload),
            ),
          );
          return;
        case PortNum.WAYPOINT_APP:
          this.events.onWaypointPacket.dispatch(
            withData(
              meta,
              fromBinary(Protobuf.Mesh.WaypointSchema, data.payload),
            ),
          );
          return;
        case PortNum.NEIGHBORINFO_APP:
          this.events.onNeighborInfoPacket.dispatch(
            withData(
              meta,
              fromBinary(Protobuf.Mesh.NeighborInfoSchema, data.payload),
            ),
          );
          return;
        case PortNum.ADMIN_APP: {
          const admin = fromBinary(
            Protobuf.Admin.AdminMessageSchema,
            data.payload,
          );
          const response = admin.payloadVariant;
          const fromSelf = meta.from === 0 || meta.from === this.myNodeNum;
          if (response.case === "getOwnerResponse" && fromSelf) {
            this.nodes.patch(this.myNodeNum, { user: response.value });
          }
          if (response.case === "getDeviceMetadataResponse" && fromSelf) {
            this.device.applyMetadata(response.value);
            this.events.onDeviceMetadataPacket.dispatch({
              from: meta.from,
              data: response.value,
            });
          }
          this.events.onAdminPacket.dispatch(withData(meta, admin));
          return;
        }
        case PortNum.NODE_STATUS_APP: {
          const status = fromBinary(
            Protobuf.Mesh.StatusMessageSchema,
            data.payload,
          );
          this.nodes.patch(meta.from, { status: status.status });
          this.events.onNodeStatusPacket.dispatch(withData(meta, status));
          return;
        }
        case PortNum.MESH_BEACON_APP: {
          const beacon = withData(
            meta,
            fromBinary(Protobuf.MeshBeacon.MeshBeaconSchema, data.payload),
          );
          this.channels.applyBeacon(beacon);
          this.events.onMeshBeaconPacket.dispatch(beacon);
          return;
        }
        default:
          return;
      }
    } catch (e) {
      log.warn("undecodable payload", { portnum: data.portnum }, e);
    }
  }
}
