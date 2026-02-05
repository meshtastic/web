import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { Protobuf, Types } from "@meshtastic/core";
import {
  createChannelPacket,
  createConfigCompletePacket,
  createConfigPacket,
  createMetadataPacket,
  createModuleConfigPacket,
  createMyInfoPacket,
  generateChannels,
  generateDeviceConfigs,
  generateMetadata,
  generateModuleConfigs,
  generateMyNodeInfo,
  serializeFromRadio,
} from "./generators/config.ts";
import { createNodeInfoPacket, generateNodeInfo } from "./generators/nodes.ts";
import {
  createPositionPacket,
  createTelemetryPacket,
  createTextMessagePacket,
} from "./generators/packets.ts";
import { type MockScenario, scenarios } from "./scenarios.ts";

const CONFIG_COMPLETE_STAGE1 = 69420;
const CONFIG_COMPLETE_STAGE2 = 69421;

export interface MockTransportOptions {
  /** Scenario name or custom scenario */
  scenario?: string | MockScenario;
  /** Override the node number */
  nodeNum?: number;
  /** Delay in ms before sending config packets (simulates real device) */
  configDelayMs?: number;
  /** Delay in ms between individual packets */
  packetDelayMs?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/** Internal device state for config persistence */
interface DeviceState {
  configs: Map<string, Protobuf.Config.Config>;
  moduleConfigs: Map<string, Protobuf.ModuleConfig.ModuleConfig>;
  channels: Map<number, Protobuf.Channel.Channel>;
  user: Protobuf.Mesh.User | null;
}

/**
 * Mock transport for development and testing without a real Meshtastic device.
 *
 * Implements the Transport interface from @meshtastic/core and simulates
 * a device connection with configurable scenarios.
 */
export class TransportMock implements Types.Transport {
  private _toDevice: WritableStream<Uint8Array>;
  private _fromDevice: ReadableStream<Types.DeviceOutput>;
  private fromDeviceController?: ReadableStreamDefaultController<Types.DeviceOutput>;

  private scenario: MockScenario;
  private options: Required<MockTransportOptions>;
  private packetId = 1;
  private activityInterval?: ReturnType<typeof setTimeout>;
  private isDisconnected = false;

  /** Device state - stores config changes made by the client */
  private deviceState: DeviceState = {
    configs: new Map(),
    moduleConfigs: new Map(),
    channels: new Map(),
    user: null,
  };

  /**
   * Create a new mock transport with the specified options
   */
  public static create(options?: MockTransportOptions): TransportMock {
    return new TransportMock(options);
  }

  constructor(options?: MockTransportOptions) {
    // Resolve scenario
    if (typeof options?.scenario === "string") {
      this.scenario = scenarios[options.scenario] ?? scenarios.default!;
    } else if (options?.scenario) {
      this.scenario = options.scenario;
    } else {
      this.scenario = scenarios.default!;
    }

    // Apply node number override
    if (options?.nodeNum) {
      this.scenario = { ...this.scenario, myNodeNum: options.nodeNum };
    }

    this.options = {
      scenario: this.scenario,
      nodeNum: this.scenario.myNodeNum,
      configDelayMs: options?.configDelayMs ?? 100,
      packetDelayMs: options?.packetDelayMs ?? 20,
      debug: options?.debug ?? false,
    };

    // Initialize device state with generated configs
    this.initializeDeviceState();

    // Create toDevice stream (receives commands from MeshDevice)
    this._toDevice = new WritableStream<Uint8Array>({
      write: (chunk) => {
        this.handleToDevicePacket(chunk);
      },
    });

    // Create fromDevice stream (sends data to MeshDevice)
    this._fromDevice = new ReadableStream<Types.DeviceOutput>({
      start: (controller) => {
        this.fromDeviceController = controller;
        // Start the connection sequence
        this.startConnectionSequence();
      },
      cancel: () => {
        this.cleanup();
      },
    });
  }

  /** Initialize device state from generators */
  private initializeDeviceState(): void {
    // Store generated configs
    for (const config of generateDeviceConfigs()) {
      if (config.payloadVariant.case) {
        this.deviceState.configs.set(config.payloadVariant.case, config);
      }
    }

    // Store generated module configs
    for (const moduleConfig of generateModuleConfigs()) {
      if (moduleConfig.payloadVariant.case) {
        this.deviceState.moduleConfigs.set(
          moduleConfig.payloadVariant.case,
          moduleConfig,
        );
      }
    }

    // Store generated channels
    for (const channel of generateChannels()) {
      this.deviceState.channels.set(channel.index, channel);
    }

    // Initialize user
    const nodeNumHex = this.scenario.myNodeNum
      .toString(16)
      .toUpperCase()
      .padStart(8, "0");
    this.deviceState.user = create(Protobuf.Mesh.UserSchema, {
      id: `!${nodeNumHex.toLowerCase()}`,
      shortName: nodeNumHex.slice(-4),
      longName: `Demo ${nodeNumHex.slice(-4)}`,
      hwModel: Protobuf.Mesh.HardwareModel.TBEAM,
      isLicensed: false,
      role: Protobuf.Config.Config_DeviceConfig_Role.CLIENT,
    });
  }

  /** Writable stream of bytes to the device */
  get toDevice(): WritableStream<Uint8Array> {
    return this._toDevice;
  }

  /** Readable stream from the device */
  get fromDevice(): ReadableStream<Types.DeviceOutput> {
    return this._fromDevice;
  }

  /** Disconnect the mock transport */
  async disconnect(): Promise<void> {
    this.isDisconnected = true;
    this.cleanup();
    this.emitStatus(Types.DeviceStatusEnum.DeviceDisconnected, "user");
  }

  private cleanup(): void {
    if (this.activityInterval) {
      clearTimeout(this.activityInterval);
      this.activityInterval = undefined;
    }
  }

  private log(message: string): void {
    if (this.options.debug) {
      console.log(`[TransportMock] ${message}`);
    }
  }

  private emitStatus(status: Types.DeviceStatusEnum, reason?: string): void {
    this.fromDeviceController?.enqueue({
      type: "status",
      data: { status, reason },
    });
  }

  private emitPacket(data: Uint8Array): void {
    if (this.isDisconnected) return;
    this.fromDeviceController?.enqueue({
      type: "packet",
      data,
    });
  }

  private nextPacketId(): number {
    return this.packetId++;
  }

  /**
   * Start the connection and config sequence
   */
  private startConnectionSequence(): void {
    this.log("Starting connection sequence");
    this.emitStatus(Types.DeviceStatusEnum.DeviceConnecting);

    // Simulate connection delay
    setTimeout(() => {
      this.emitStatus(Types.DeviceStatusEnum.DeviceConnected);
    }, 50);
  }

  /**
   * Handle incoming packets from MeshDevice (commands to the device)
   */
  private handleToDevicePacket(data: Uint8Array): void {
    try {
      const toRadio = fromBinary(Protobuf.Mesh.ToRadioSchema, data);
      this.log(`Received ToRadio: ${toRadio.payloadVariant.case}`);

      switch (toRadio.payloadVariant.case) {
        case "wantConfigId":
          this.handleWantConfig(toRadio.payloadVariant.value);
          break;
        case "heartbeat":
          this.log("Received heartbeat");
          // No response needed for heartbeat
          break;
        case "packet":
          this.handleOutgoingPacket(toRadio.payloadVariant.value);
          break;
        default:
          this.log(`Unhandled ToRadio variant: ${toRadio.payloadVariant.case}`);
      }
    } catch (e) {
      this.log(`Error decoding ToRadio: ${e}`);
    }
  }

  /**
   * Handle config request from MeshDevice
   */
  private handleWantConfig(nonce: number): void {
    this.log(`Config requested with nonce: ${nonce}`);

    // Run config sequence async
    this.sendConfigSequence(nonce).catch((e) => {
      this.log(`Error in config sequence: ${e}`);
    });
  }

  /**
   * Send the full configuration sequence
   */
  private async sendConfigSequence(nonce: number): Promise<void> {
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    await delay(this.options.configDelayMs);

    // Stage 1: Send device info and config
    if (nonce === CONFIG_COMPLETE_STAGE1) {
      // 1. Send MyNodeInfo
      const myNodeInfo = generateMyNodeInfo(this.scenario.myNodeNum);
      this.emitPacket(serializeFromRadio(createMyInfoPacket(myNodeInfo)));
      // Extra delay after MyNodeInfo to ensure it's processed before config complete
      // This prevents a race condition where configComplete fires before myNodeNum is set
      await delay(Math.max(this.options.packetDelayMs, 100));

      // 2. Send metadata
      const metadata = generateMetadata();
      this.emitPacket(
        serializeFromRadio(createMetadataPacket(metadata, this.nextPacketId())),
      );
      await delay(this.options.packetDelayMs);

      // 3. Send device configs from state
      for (const config of this.deviceState.configs.values()) {
        this.emitPacket(
          serializeFromRadio(createConfigPacket(config, this.nextPacketId())),
        );
        await delay(this.options.packetDelayMs);
      }

      // 4. Send module configs from state
      for (const moduleConfig of this.deviceState.moduleConfigs.values()) {
        this.emitPacket(
          serializeFromRadio(
            createModuleConfigPacket(moduleConfig, this.nextPacketId()),
          ),
        );
        await delay(this.options.packetDelayMs);
      }

      // 5. Send channels from state
      for (const channel of this.deviceState.channels.values()) {
        this.emitPacket(
          serializeFromRadio(createChannelPacket(channel, this.nextPacketId())),
        );
        await delay(this.options.packetDelayMs);
      }

      // 6. Send config complete
      this.emitPacket(
        serializeFromRadio(
          createConfigCompletePacket(
            CONFIG_COMPLETE_STAGE1,
            this.nextPacketId(),
          ),
        ),
      );
      this.log("Stage 1 config complete sent");
    }

    // Stage 2: Send node info
    if (nonce === CONFIG_COMPLETE_STAGE2) {
      // Send local device's own NodeInfo first
      const myNodeInfo = generateNodeInfo({
        nodeNum: this.scenario.myNodeNum,
        shortName: this.deviceState.user?.shortName,
        longName: this.deviceState.user?.longName,
        hwModel: this.deviceState.user?.hwModel,
        latitude: this.scenario.centerLat,
        longitude: this.scenario.centerLon,
      });
      this.emitPacket(
        serializeFromRadio(
          createNodeInfoPacket(myNodeInfo, this.nextPacketId()),
        ),
      );
      await delay(this.options.packetDelayMs);

      // Send node info for each mesh node
      for (const nodeOptions of this.scenario.nodes) {
        const nodeInfo = generateNodeInfo(nodeOptions);
        this.emitPacket(
          serializeFromRadio(
            createNodeInfoPacket(nodeInfo, this.nextPacketId()),
          ),
        );
        await delay(this.options.packetDelayMs);
      }

      // Send config complete
      this.emitPacket(
        serializeFromRadio(
          createConfigCompletePacket(
            CONFIG_COMPLETE_STAGE2,
            this.nextPacketId(),
          ),
        ),
      );
      this.log("Stage 2 config complete sent");

      // Start activity simulation after config is complete
      this.startActivitySimulation();
    }
  }

  /**
   * Handle outgoing mesh packets (messages, admin commands, etc.)
   */
  private handleOutgoingPacket(packet: Protobuf.Mesh.MeshPacket): void {
    if (packet.payloadVariant.case !== "decoded") {
      this.log(`Ignoring non-decoded packet`);
      return;
    }

    const decoded = packet.payloadVariant.value;
    this.log(`Outgoing packet: portnum=${decoded.portnum}, to=${packet.to}`);

    // Handle admin messages
    if (decoded.portnum === Protobuf.Portnums.PortNum.ADMIN_APP) {
      this.handleAdminMessage(packet, decoded.payload);
      return;
    }

    // For other packets, just send a routing ACK
    this.sendRoutingAck(packet.id, packet.from);
  }

  /**
   * Handle admin messages (config changes, requests, etc.)
   */
  private handleAdminMessage(
    packet: Protobuf.Mesh.MeshPacket,
    payload: Uint8Array,
  ): void {
    try {
      const adminMessage = fromBinary(
        Protobuf.Admin.AdminMessageSchema,
        payload,
      );
      this.log(`Admin message: ${adminMessage.payloadVariant.case}`);

      switch (adminMessage.payloadVariant.case) {
        // Config setters
        case "setConfig":
          this.handleSetConfig(adminMessage.payloadVariant.value);
          this.sendRoutingAck(packet.id, packet.from);
          break;

        case "setModuleConfig":
          this.handleSetModuleConfig(adminMessage.payloadVariant.value);
          this.sendRoutingAck(packet.id, packet.from);
          break;

        case "setOwner":
          this.handleSetOwner(adminMessage.payloadVariant.value);
          this.sendRoutingAck(packet.id, packet.from);
          break;

        case "setChannel":
          this.handleSetChannel(adminMessage.payloadVariant.value);
          this.sendRoutingAck(packet.id, packet.from);
          break;

        // Config getters
        case "getConfigRequest":
          this.handleGetConfigRequest(
            adminMessage.payloadVariant.value,
            packet.from,
          );
          break;

        case "getModuleConfigRequest":
          this.handleGetModuleConfigRequest(
            adminMessage.payloadVariant.value,
            packet.from,
          );
          break;

        case "getOwnerRequest":
          this.handleGetOwnerRequest(packet.from);
          break;

        case "getChannelRequest":
          this.handleGetChannelRequest(
            adminMessage.payloadVariant.value,
            packet.from,
          );
          break;

        // Other admin commands - just ACK them
        case "beginEditSettings":
        case "commitEditSettings":
        case "rebootSeconds":
        case "rebootOtaSeconds":
        case "factoryResetDevice":
          this.log(`Received ${adminMessage.payloadVariant.case}, sending ACK`);
          this.sendRoutingAck(packet.id, packet.from);
          break;

        default:
          this.log(
            `Unhandled admin message: ${adminMessage.payloadVariant.case}`,
          );
          this.sendRoutingAck(packet.id, packet.from);
      }
    } catch (e) {
      this.log(`Error handling admin message: ${e}`);
      this.sendRoutingError(
        packet.id,
        packet.from,
        Protobuf.Mesh.Routing_Error.BAD_REQUEST,
      );
    }
  }

  /**
   * Handle setConfig admin message
   */
  private handleSetConfig(config: Protobuf.Config.Config): void {
    if (!config.payloadVariant.case) {
      this.log("setConfig: no variant case");
      return;
    }

    this.log(`setConfig: ${config.payloadVariant.case}`);
    this.deviceState.configs.set(config.payloadVariant.case, config);
  }

  /**
   * Handle setModuleConfig admin message
   */
  private handleSetModuleConfig(
    moduleConfig: Protobuf.ModuleConfig.ModuleConfig,
  ): void {
    if (!moduleConfig.payloadVariant.case) {
      this.log("setModuleConfig: no variant case");
      return;
    }

    this.log(`setModuleConfig: ${moduleConfig.payloadVariant.case}`);
    this.deviceState.moduleConfigs.set(
      moduleConfig.payloadVariant.case,
      moduleConfig,
    );
  }

  /**
   * Handle setOwner admin message
   */
  private handleSetOwner(user: Protobuf.Mesh.User): void {
    this.log(`setOwner: ${user.longName}`);
    this.deviceState.user = user;
  }

  /**
   * Handle setChannel admin message
   */
  private handleSetChannel(channel: Protobuf.Channel.Channel): void {
    this.log(`setChannel: index=${channel.index}`);
    this.deviceState.channels.set(channel.index, channel);
  }

  /**
   * Handle getConfigRequest - send back the requested config
   */
  private handleGetConfigRequest(
    configType: Protobuf.Admin.AdminMessage_ConfigType,
    requestFrom: number,
  ): void {
    const configTypeMap: Record<number, string> = {
      [Protobuf.Admin.AdminMessage_ConfigType.DEVICE_CONFIG]: "device",
      [Protobuf.Admin.AdminMessage_ConfigType.POSITION_CONFIG]: "position",
      [Protobuf.Admin.AdminMessage_ConfigType.POWER_CONFIG]: "power",
      [Protobuf.Admin.AdminMessage_ConfigType.NETWORK_CONFIG]: "network",
      [Protobuf.Admin.AdminMessage_ConfigType.DISPLAY_CONFIG]: "display",
      [Protobuf.Admin.AdminMessage_ConfigType.LORA_CONFIG]: "lora",
      [Protobuf.Admin.AdminMessage_ConfigType.BLUETOOTH_CONFIG]: "bluetooth",
      [Protobuf.Admin.AdminMessage_ConfigType.SECURITY_CONFIG]: "security",
    };

    const configKey = configTypeMap[configType];
    if (!configKey) {
      this.log(`getConfigRequest: unknown config type ${configType}`);
      return;
    }

    const config = this.deviceState.configs.get(configKey);
    if (!config) {
      this.log(`getConfigRequest: config ${configKey} not found`);
      return;
    }

    this.log(`getConfigRequest: sending ${configKey}`);
    this.sendAdminResponse(requestFrom, {
      case: "getConfigResponse",
      value: config,
    });
  }

  /**
   * Handle getModuleConfigRequest - send back the requested module config
   */
  private handleGetModuleConfigRequest(
    moduleConfigType: Protobuf.Admin.AdminMessage_ModuleConfigType,
    requestFrom: number,
  ): void {
    const moduleConfigTypeMap: Record<number, string> = {
      [Protobuf.Admin.AdminMessage_ModuleConfigType.MQTT_CONFIG]: "mqtt",
      [Protobuf.Admin.AdminMessage_ModuleConfigType.SERIAL_CONFIG]: "serial",
      [Protobuf.Admin.AdminMessage_ModuleConfigType.EXTNOTIF_CONFIG]:
        "externalNotification",
      [Protobuf.Admin.AdminMessage_ModuleConfigType.STOREFORWARD_CONFIG]:
        "storeForward",
      [Protobuf.Admin.AdminMessage_ModuleConfigType.RANGETEST_CONFIG]:
        "rangeTest",
      [Protobuf.Admin.AdminMessage_ModuleConfigType.TELEMETRY_CONFIG]:
        "telemetry",
      [Protobuf.Admin.AdminMessage_ModuleConfigType.CANNEDMSG_CONFIG]:
        "cannedMessage",
      [Protobuf.Admin.AdminMessage_ModuleConfigType.AUDIO_CONFIG]: "audio",
      [Protobuf.Admin.AdminMessage_ModuleConfigType.REMOTEHARDWARE_CONFIG]:
        "remoteHardware",
      [Protobuf.Admin.AdminMessage_ModuleConfigType.NEIGHBORINFO_CONFIG]:
        "neighborInfo",
      [Protobuf.Admin.AdminMessage_ModuleConfigType.AMBIENTLIGHTING_CONFIG]:
        "ambientLighting",
      [Protobuf.Admin.AdminMessage_ModuleConfigType.DETECTIONSENSOR_CONFIG]:
        "detectionSensor",
      [Protobuf.Admin.AdminMessage_ModuleConfigType.PAXCOUNTER_CONFIG]:
        "paxcounter",
    };

    const configKey = moduleConfigTypeMap[moduleConfigType];
    if (!configKey) {
      this.log(
        `getModuleConfigRequest: unknown module config type ${moduleConfigType}`,
      );
      return;
    }

    const moduleConfig = this.deviceState.moduleConfigs.get(configKey);
    if (!moduleConfig) {
      this.log(`getModuleConfigRequest: module config ${configKey} not found`);
      return;
    }

    this.log(`getModuleConfigRequest: sending ${configKey}`);
    this.sendAdminResponse(requestFrom, {
      case: "getModuleConfigResponse",
      value: moduleConfig,
    });
  }

  /**
   * Handle getOwnerRequest - send back the user info
   */
  private handleGetOwnerRequest(requestFrom: number): void {
    if (!this.deviceState.user) {
      this.log("getOwnerRequest: no user set");
      return;
    }

    this.log("getOwnerRequest: sending user");
    this.sendAdminResponse(requestFrom, {
      case: "getOwnerResponse",
      value: this.deviceState.user,
    });
  }

  /**
   * Handle getChannelRequest - send back the requested channel
   */
  private handleGetChannelRequest(
    channelIndex: number,
    requestFrom: number,
  ): void {
    const channel = this.deviceState.channels.get(channelIndex);
    if (!channel) {
      this.log(`getChannelRequest: channel ${channelIndex} not found`);
      return;
    }

    this.log(`getChannelRequest: sending channel ${channelIndex}`);
    this.sendAdminResponse(requestFrom, {
      case: "getChannelResponse",
      value: channel,
    });
  }

  /**
   * Send an admin response packet
   */
  private sendAdminResponse(
    to: number,
    payloadVariant: Protobuf.Admin.AdminMessage["payloadVariant"],
  ): void {
    const adminMessage = create(Protobuf.Admin.AdminMessageSchema, {
      payloadVariant,
    });

    const dataPacket = create(Protobuf.Mesh.DataSchema, {
      portnum: Protobuf.Portnums.PortNum.ADMIN_APP,
      payload: toBinary(Protobuf.Admin.AdminMessageSchema, adminMessage),
    });

    const meshPacket = create(Protobuf.Mesh.MeshPacketSchema, {
      from: this.scenario.myNodeNum,
      to,
      id: this.nextPacketId(),
      rxTime: Math.floor(Date.now() / 1000),
      hopLimit: 3,
      hopStart: 3,
      payloadVariant: {
        case: "decoded",
        value: dataPacket,
      },
    });

    const fromRadio = create(Protobuf.Mesh.FromRadioSchema, {
      id: this.nextPacketId(),
      payloadVariant: {
        case: "packet",
        value: meshPacket,
      },
    });

    this.emitPacket(serializeFromRadio(fromRadio));
  }

  /**
   * Send a routing ACK for a packet
   */
  private sendRoutingAck(requestId: number, to: number): void {
    this.sendRoutingResponse(requestId, to, Protobuf.Mesh.Routing_Error.NONE);
  }

  /**
   * Send a routing error for a packet
   */
  private sendRoutingError(
    requestId: number,
    to: number,
    error: Protobuf.Mesh.Routing_Error,
  ): void {
    this.sendRoutingResponse(requestId, to, error);
  }

  /**
   * Send a routing response (ACK or error)
   */
  private sendRoutingResponse(
    requestId: number,
    to: number,
    error: Protobuf.Mesh.Routing_Error,
  ): void {
    const routing = create(Protobuf.Mesh.RoutingSchema, {
      variant: {
        case: "errorReason",
        value: error,
      },
    });

    const dataPacket = create(Protobuf.Mesh.DataSchema, {
      portnum: Protobuf.Portnums.PortNum.ROUTING_APP,
      payload: toBinary(Protobuf.Mesh.RoutingSchema, routing),
      requestId,
    });

    const meshPacket = create(Protobuf.Mesh.MeshPacketSchema, {
      from: this.scenario.myNodeNum,
      to,
      id: this.nextPacketId(),
      rxTime: Math.floor(Date.now() / 1000),
      hopLimit: 3,
      hopStart: 3,
      payloadVariant: {
        case: "decoded",
        value: dataPacket,
      },
    });

    const fromRadio = create(Protobuf.Mesh.FromRadioSchema, {
      id: this.nextPacketId(),
      payloadVariant: {
        case: "packet",
        value: meshPacket,
      },
    });

    this.emitPacket(serializeFromRadio(fromRadio));
  }

  /**
   * Schedule the next random activity tick with a random 1–10 minute delay
   */
  private scheduleNextActivity(): void {
    const minMs = 60_000;
    const maxMs = 600_000;
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;

    this.activityInterval = setTimeout(() => {
      this.simulateRandomActivity();
      this.scheduleNextActivity();
    }, delay);

    this.log(`Next activity in ${Math.round(delay / 1000)}s`);
  }

  /**
   * Start simulating mesh activity (messages, positions, telemetry)
   */
  private startActivitySimulation(): void {
    if (this.scenario.nodes.length === 0) return;

    this.log("Starting activity simulation (1–10 min random intervals)");
    this.scheduleNextActivity();
  }

  /**
   * Simulate random mesh activity
   */
  private simulateRandomActivity(): void {
    if (this.isDisconnected) return;

    const activityType = Math.random();
    const randomNode =
      this.scenario.nodes[
        Math.floor(Math.random() * this.scenario.nodes.length)
      ];

    if (!randomNode) return;

    if (activityType < 0.4 && this.scenario.simulateMessages) {
      // Simulate incoming message
      const messages = [
        "Hello from the mesh!",
        "Testing 1 2 3",
        "Anyone copy?",
        "Good signal today",
        "Check out this view!",
        "Heading home",
        "What's the weather like?",
      ];
      const message =
        messages[Math.floor(Math.random() * messages.length)] ?? "Hello";

      this.emitPacket(
        serializeFromRadio(
          createTextMessagePacket(
            randomNode.nodeNum,
            0xffffffff, // broadcast
            message,
            0,
            this.nextPacketId(),
          ),
        ),
      );
      this.log(`Simulated message from ${randomNode.shortName}: "${message}"`);
    } else if (activityType < 0.7 && this.scenario.simulatePositions) {
      // Simulate position update
      const lat = randomNode.latitude ?? this.scenario.centerLat;
      const lon = randomNode.longitude ?? this.scenario.centerLon;
      const alt = randomNode.altitude ?? 100;

      // Add small random movement
      const newLat = lat + (Math.random() - 0.5) * 0.001;
      const newLon = lon + (Math.random() - 0.5) * 0.001;

      this.emitPacket(
        serializeFromRadio(
          createPositionPacket(
            randomNode.nodeNum,
            newLat,
            newLon,
            alt,
            this.nextPacketId(),
          ),
        ),
      );
      this.log(`Simulated position from ${randomNode.shortName}`);
    } else if (this.scenario.simulateTelemetry) {
      // Simulate telemetry update
      this.emitPacket(
        serializeFromRadio(
          createTelemetryPacket(
            randomNode.nodeNum,
            randomNode.batteryLevel ?? Math.floor(Math.random() * 100),
            randomNode.voltage ?? 3.7 + Math.random() * 0.5,
            Math.random() * 30,
            Math.random() * 10,
            this.nextPacketId(),
          ),
        ),
      );
      this.log(`Simulated telemetry from ${randomNode.shortName}`);
    }
  }
}
