import { create, toBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import type { Logger } from "tslog";
import { Constants } from "../constants/index.ts";
import { EventBus } from "../event-bus/EventBus.ts";
import {
  FirmwareTooOldError,
  HandshakeTimeoutError,
  PacketTooLargeError,
} from "../errors/MeshError.ts";
import { firmwareSupport } from "../../features/device/domain/FirmwareVersion.ts";
import { generatePacketId } from "../identifiers/PacketId.ts";
import { createLogger } from "../logging/logger.ts";
import { decodePacket } from "../packet-codec/decodePacket.ts";
import { Queue } from "../queue/Queue.ts";
import { createStore, type ReadonlySignal } from "../signals/createStore.ts";
import type { Transport } from "../transport/Transport.ts";
import { DeviceStatusEnum } from "../transport/Transport.ts";
import {
  ChannelNumber,
  type Destination,
  Emitter,
  type PacketMetadata,
} from "../types.ts";
import { Xmodem } from "../xmodem/Xmodem.ts";
import {
  CONFIG_NONCE,
  FIRST_HEARTBEAT_NONCE,
  HANDSHAKE_FRAME_CASES,
  HANDSHAKE_IDLE_TIMEOUT_MS,
  HANDSHAKE_SETTLE_MS,
  HANDSHAKE_STAGE_MAX_MS,
  HEARTBEAT_INTERVAL_MS,
  NODEDB_NONCE,
  sleep,
} from "./handshake.ts";
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
  /**
   * How the chat, draft, nodes and telemetry repositories are scoped. With
   * `"node"` they keep one history per radio, whatever the transport: as
   * soon as the handshake's my_info names the radio, the client calls
   * {@link MeshClient.rescopeStorage} with its node number, unless the
   * repositories were already opened for that node (`storageNodeNum`).
   * my_info is the first handshake frame, so this happens before the NodeDB
   * and any message arrives. Left out, the repositories are never rescoped.
   */
  storageScope?: "node";
  /**
   * The node number the repositories were opened for, when the caller knows
   * it (e.g. saved from an earlier connection). Only read with
   * `storageScope: "node"`.
   */
  storageNodeNum?: number;
  /**
   * Keep-alive interval once the handshake completes. Defaults to
   * {@link HEARTBEAT_INTERVAL_MS}; `false` disables the automatic heartbeat.
   */
  heartbeatIntervalMs?: number | false;
}

type HandshakeStage = "idle" | "config" | "settling" | "nodedb" | "complete";

/**
 * Per-section / per-event tally of what has streamed in since the most
 * recent `configure()` call. UI surfaces use this for live "received X
 * channels, Y nodes" feedback during the handshake.
 */
export interface ConnectionProgressCounters {
  config: number;
  modules: number;
  channels: number;
  nodes: number;
  myInfo: boolean;
  metadata: boolean;
}

/**
 * Connection progress signal shape. The state machine moves
 * `idle → configuring → configured` once `configure()` runs and the
 * device finishes both handshake stages.
 */
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

  /**
   * Live connection-handshake progress. Resets to `configuring` with empty
   * counters when `configure()` is called; tallies each inbound config /
   * module / channel / node packet; flips to `configured` when the device
   * sends `configCompleteId`.
   */
  public readonly progress: ReadonlySignal<ConnectionProgress>;
  private readonly progressStore = createStore<ConnectionProgress>({
    phase: "idle",
  });

  private _heartbeatIntervalId: ReturnType<typeof setInterval> | undefined;
  private readonly heartbeatIntervalMs: number | false;
  private heartbeatNonce = FIRST_HEARTBEAT_NONCE;
  private storageNodeNum: number | undefined;

  private handshakeStage: HandshakeStage = "idle";
  private handshakeTimer: ReturnType<typeof setTimeout> | undefined;
  private handshakeStageTimer: ReturnType<typeof setTimeout> | undefined;
  private handshakeHasMyInfo = false;
  private handshakeTimeSent = false;
  private handshakeWaiters: {
    resolve: (nonce: number) => void;
    reject: (error: unknown) => void;
  }[] = [];

  constructor(options: MeshClientOptions) {
    this.log = options.logger ?? createLogger("MeshClient");
    this.transport = options.transport;
    this.events = new EventBus();
    this.queue = new Queue();
    this.xModem = new Xmodem(this.sendRaw.bind(this));
    this.configId = options.configId ?? generatePacketId();
    this.heartbeatIntervalMs =
      options.heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_MS;
    this.storageNodeNum = options.storageNodeNum;

    // Subscribed before the slice clients so the repositories already point
    // at the new scope when their own my_info handlers run (ChatClient
    // refiles sent direct messages there). The handler only runs once a frame
    // arrives, after the slices below exist.
    if (options.storageScope === "node") {
      this.events.onMyNodeInfo.subscribe((info) => {
        if (info.myNodeNum <= 0 || info.myNodeNum === this.storageNodeNum)
          return;
        this.rescopeStorage(info.myNodeNum);
      });
    }

    this.device = new DeviceClient(this);
    this.chat = new ChatClient(this, options.chat);
    this.nodes = new NodesClient(this, options.nodes);
    this.channels = new ChannelsClient(this);
    this.config = new ConfigClient(this);
    this.telemetry = new TelemetryClient(this, options.telemetry);
    this.position = new PositionClient(this);
    this.traceroute = new TraceRouteClient(this);
    this.files = new FilesClient(this);

    this.progress = this.progressStore.read;
    this.wireProgressTracking();
    this.wireHandshake();

    this.events.onDeviceStatus.subscribe((status) => {
      if (status === DeviceStatusEnum.DeviceDisconnected) {
        this.stopHeartbeat();
        this.failHandshake(new Error("Device connection lost"));
        this.complete();
      }
    });

    this.transport.fromDevice.pipeTo(decodePacket(this));
  }

  public get myNodeNum(): number {
    return this.device.myNodeNum.value ?? 0;
  }

  /**
   * Points every slice's repositories at the history stored for `nodeNum`
   * and reloads from it what the slices had loaded (open conversations,
   * drafts, the node list, telemetry), dropping what they held for the old
   * scope. Signals already handed out stay valid. Repositories without a
   * `setScope` (the in-memory defaults) keep their contents.
   */
  public rescopeStorage(nodeNum: number): void {
    this.log.debug(
      Emitter[Emitter.Configure],
      `Storage scope ${this.storageNodeNum ?? "none"} -> ${nodeNum}`,
    );
    this.storageNodeNum = nodeNum;
    this.chat.rescope(nodeNum);
    this.nodes.rescope(nodeNum);
    this.telemetry.rescope(nodeNum);
  }

  /**
   * Run the two-stage handshake. Resolves once the device has sent both
   * config and NodeDB; rejects with {@link HandshakeTimeoutError} if it stops
   * responding.
   */
  public async connect(): Promise<void> {
    this.updateDeviceStatus(DeviceStatusEnum.DeviceConnecting);
    await this.configure();
  }

  /**
   * Start (or restart, e.g. after `rebooted`) the handshake. Calling it while
   * a handshake is already running restarts it; every pending caller settles
   * when the restarted handshake does.
   */
  public configure(): Promise<number> {
    this.log.debug(
      Emitter[Emitter.Configure],
      "⚙️ Requesting device configuration",
    );
    this.stopHeartbeat();
    this.updateDeviceStatus(DeviceStatusEnum.DeviceConfiguring);
    this.progressStore.write.value = {
      phase: "configuring",
      received: { ...EMPTY_COUNTERS },
    };

    const done = new Promise<number>((resolve, reject) => {
      this.handshakeWaiters.push({ resolve, reject });
    });
    this.handshakeTimeSent = false;
    this.handshakeHasMyInfo = false;
    this.startHandshakeStage("config");
    return done;
  }

  private startHandshakeStage(stage: "config" | "nodedb"): void {
    this.handshakeStage = stage;
    this.sendWantConfig(stage === "config" ? CONFIG_NONCE : NODEDB_NONCE);
    this.armHandshakeTimer();
    if (this.handshakeStageTimer !== undefined) {
      clearTimeout(this.handshakeStageTimer);
    }
    this.handshakeStageTimer = setTimeout(
      () => this.onHandshakeStall(),
      HANDSHAKE_STAGE_MAX_MS,
    );
  }

  private sendWantConfig(nonce: number): void {
    const toRadio = create(Protobuf.Mesh.ToRadioSchema, {
      payloadVariant: { case: "wantConfigId", value: nonce },
    });
    this.sendRaw(toBinary(Protobuf.Mesh.ToRadioSchema, toRadio), undefined, {
      expectAck: false,
    }).catch((e: unknown) => this.failHandshake(e));
  }

  private armHandshakeTimer(): void {
    if (this.handshakeTimer !== undefined) clearTimeout(this.handshakeTimer);
    this.handshakeTimer = setTimeout(
      () => this.onHandshakeStall(),
      HANDSHAKE_IDLE_TIMEOUT_MS,
    );
  }

  private clearHandshakeTimer(): void {
    if (this.handshakeTimer !== undefined) {
      clearTimeout(this.handshakeTimer);
      this.handshakeTimer = undefined;
    }
    if (this.handshakeStageTimer !== undefined) {
      clearTimeout(this.handshakeStageTimer);
      this.handshakeStageTimer = undefined;
    }
  }

  private onHandshakeStall(): void {
    const stage = this.handshakeStage;
    if (stage !== "config" && stage !== "nodedb") return;
    this.log.warn(
      Emitter[Emitter.Configure],
      `⚠️ Handshake stalled in the ${stage} stage`,
    );
    this.failHandshake(new HandshakeTimeoutError(stage));
  }

  private failHandshake(error: unknown): void {
    this.clearHandshakeTimer();
    if (this.handshakeStage === "complete" || this.handshakeStage === "idle") {
      return;
    }
    this.handshakeStage = "idle";
    const waiters = this.handshakeWaiters;
    this.handshakeWaiters = [];
    for (const w of waiters) w.reject(error);
  }

  private finishHandshake(): void {
    this.clearHandshakeTimer();
    this.handshakeStage = "complete";
    const cur = this.progressStore.read.value;
    const received =
      cur.phase === "configuring" ? cur.received : { ...EMPTY_COUNTERS };
    this.progressStore.write.value = { phase: "configured", received };
    this.updateDeviceStatus(DeviceStatusEnum.DeviceConfigured);
    if (this.heartbeatIntervalMs !== false) {
      this.setHeartbeatInterval(this.heartbeatIntervalMs);
    }
    const waiters = this.handshakeWaiters;
    this.handshakeWaiters = [];
    for (const w of waiters) w.resolve(NODEDB_NONCE);
  }

  private wireHandshake(): void {
    // Only handshake frames prove the handshake is progressing; live mesh
    // traffic would otherwise keep a stalled handshake alive forever.
    this.events.onFromRadio.subscribe((fromRadio) => {
      if (
        (this.handshakeStage === "config" ||
          this.handshakeStage === "nodedb") &&
        HANDSHAKE_FRAME_CASES.has(fromRadio.payloadVariant.case ?? "")
      ) {
        this.armHandshakeTimer();
      }
    });

    // Set the clock as soon as the device identifies itself, so firmware can
    // timestamp the backlog it replays during the handshake.
    this.events.onMyNodeInfo.subscribe((info) => {
      if (this.handshakeStage === "config") this.handshakeHasMyInfo = true;
      if (this.handshakeStage !== "config" || this.handshakeTimeSent) return;
      this.handshakeTimeSent = true;
      this.sendSetTimeOnly(info.myNodeNum);
    });

    // Refuse firmware older than the Android app's absolute minimum.
    this.events.onDeviceMetadataPacket.subscribe((packet) => {
      if (this.handshakeStage !== "config" || packet.from !== 0) return;
      const version = packet.data.firmwareVersion;
      if (firmwareSupport(version) !== "tooOld") return;
      this.log.error(
        Emitter[Emitter.Configure],
        `Firmware ${version} is too old for this client`,
      );
      this.failHandshake(new FirmwareTooOldError(version));
      this.disconnect().catch(() => {});
    });

    this.events.onConfigComplete.subscribe((nonce) => {
      if (this.handshakeStage === "config" && nonce === CONFIG_NONCE) {
        if (!this.handshakeHasMyInfo) {
          // my_info was lost; without it the session has no identity.
          this.log.warn(
            Emitter[Emitter.Configure],
            "⚠️ Config stage completed without my_info",
          );
          this.failHandshake(new HandshakeTimeoutError("config"));
          return;
        }
        this.handshakeStage = "settling";
        this.clearHandshakeTimer();
        void this.settleBetweenStages();
      } else if (this.handshakeStage === "nodedb" && nonce === NODEDB_NONCE) {
        this.finishHandshake();
      } else {
        this.log.debug(
          Emitter[Emitter.Configure],
          `Ignoring config_complete_id ${nonce} in stage ${this.handshakeStage}`,
        );
      }
    });
  }

  private async settleBetweenStages(): Promise<void> {
    await sleep(HANDSHAKE_SETTLE_MS);
    if (this.handshakeStage !== "settling") return;
    this.heartbeat().catch(() => {
      // best effort; the NodeDB request below re-arms the stall guard
    });
    await sleep(HANDSHAKE_SETTLE_MS);
    if (this.handshakeStage !== "settling") return;
    this.startHandshakeStage("nodedb");
  }

  private sendSetTimeOnly(myNodeNum: number): void {
    const admin = create(Protobuf.Admin.AdminMessageSchema, {
      payloadVariant: {
        case: "setTimeOnly",
        value: Math.floor(Date.now() / 1000),
      },
    });
    const meshPacket = create(Protobuf.Mesh.MeshPacketSchema, {
      payloadVariant: {
        case: "decoded",
        value: {
          payload: toBinary(Protobuf.Admin.AdminMessageSchema, admin),
          portnum: Protobuf.Portnums.PortNum.ADMIN_APP,
        },
      },
      from: myNodeNum,
      to: myNodeNum,
      id: generatePacketId(),
    });
    const toRadio = create(Protobuf.Mesh.ToRadioSchema, {
      payloadVariant: { case: "packet", value: meshPacket },
    });
    this.sendRaw(
      toBinary(Protobuf.Mesh.ToRadioSchema, toRadio),
      meshPacket.id,
      {
        expectAck: false,
      },
    ).catch((e: unknown) => {
      this.log.warn(Emitter[Emitter.Configure], "⚠️ Unable to set time", e);
    });
  }

  /**
   * Subscribe progress counters to the relevant inbound events. Each
   * subscriber bumps the matching field on the current `configuring`
   * snapshot; `onConfigComplete` flips the phase to `configured`.
   *
   * Outside of an active handshake (phase=idle) inbound packets are
   * ignored — they belong to a later session that re-runs configure().
   */
  private wireProgressTracking(): void {
    const bump = (field: keyof ConnectionProgressCounters): void => {
      const cur = this.progressStore.read.value;
      if (cur.phase !== "configuring") return;
      const next: ConnectionProgressCounters = {
        ...cur.received,
        [field]:
          typeof cur.received[field] === "number"
            ? cur.received[field] + 1
            : true,
      } as ConnectionProgressCounters;
      this.progressStore.write.value = { phase: "configuring", received: next };
    };

    this.events.onConfigPacket.subscribe(() => bump("config"));
    this.events.onModuleConfigPacket.subscribe(() => bump("modules"));
    this.events.onChannelPacket.subscribe(() => bump("channels"));
    this.events.onNodeInfoPacket.subscribe(() => bump("nodes"));
    this.events.onMyNodeInfo.subscribe(() => bump("myInfo"));
    this.events.onDeviceMetadataPacket.subscribe(() => bump("metadata"));
  }

  public heartbeat(): Promise<number> {
    this.log.debug(Emitter[Emitter.Ping], "❤️ Send heartbeat ping to radio");
    const nonce = this.heartbeatNonce;
    this.heartbeatNonce =
      nonce >= 0xffffffff ? FIRST_HEARTBEAT_NONCE : nonce + 1;
    const toRadio = create(Protobuf.Mesh.ToRadioSchema, {
      payloadVariant: { case: "heartbeat", value: { nonce } },
    });
    return this.sendRaw(
      toBinary(Protobuf.Mesh.ToRadioSchema, toRadio),
      undefined,
      {
        expectAck: false,
      },
    );
  }

  public setHeartbeatInterval(interval: number): void {
    this.stopHeartbeat();
    this._heartbeatIntervalId = setInterval(() => {
      this.heartbeat().catch((err: Error) => {
        this.log.error(
          Emitter[Emitter.Ping],
          `⚠️ Unable to send heartbeat: ${err.message}`,
        );
      });
    }, interval);
  }

  private stopHeartbeat(): void {
    if (this._heartbeatIntervalId !== undefined) {
      clearInterval(this._heartbeatIntervalId);
      this._heartbeatIntervalId = undefined;
    }
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
    packetId?: number,
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
      id: packetId ?? generatePacketId(),
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
    return await this.sendRaw(
      toBinary(Protobuf.Mesh.ToRadioSchema, toRadioMessage),
      meshPacket.id,
    );
  }

  /**
   * Queue a ToRadio frame. Resolves on the device's ack, or as soon as the
   * frame is written when `expectAck` is false (the device never acks
   * heartbeats, `want_config_id`, or packets sent without `want_ack`).
   */
  public async sendRaw(
    toRadio: Uint8Array,
    id: number = generatePacketId(),
    { expectAck = true }: { expectAck?: boolean } = {},
  ): Promise<number> {
    if (toRadio.length > 512) {
      throw new PacketTooLargeError(toRadio.length);
    }
    const settled = this.queue.push({ id, data: toRadio }, { expectAck });
    await this.queue.processQueue(this.transport.toDevice);
    return settled;
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
    this.stopHeartbeat();
    this.failHandshake(new Error("Device connection lost"));
    this.complete();
    await this.transport.toDevice.close();
    await this.transport.disconnect();
    this.updateDeviceStatus(DeviceStatusEnum.DeviceDisconnected);
  }
}
