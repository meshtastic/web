import type { MeshDevice } from "@meshtastic/core";
import { type Protobuf, Types } from "@meshtastic/core";
import { SimpleEventDispatcher } from "ste-simple-events";

// Constants

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Types

export enum ConnectionState {
  CONNECTED = "CONNECTED",
  DISCONNECTED = "DISCONNECTED",
  DEVICE_SLEEP = "DEVICE_SLEEP",
  CONFIGURING = "CONFIGURING",
  CONFIGURED = "CONFIGURED",
}

interface ConfigState {
  configuring: boolean;
  nodeCount: number;
  configCount: number;
  moduleConfigCount: number;
  channelCount: number;
  newNodes: Protobuf.Mesh.NodeInfo[];
}

export class MeshService {
  private meshDevice: MeshDevice;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private configState: ConfigState;
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;

  // Event dispatchers
  public readonly onStageStart: SimpleEventDispatcher<{
    stage: string;
  }> = new SimpleEventDispatcher<{ stage: string }>();

  public readonly onStageComplete: SimpleEventDispatcher<
    Record<string, unknown>
  > = new SimpleEventDispatcher<Record<string, unknown>>();

  public readonly onProgress: SimpleEventDispatcher<{
    stage: string;
    count: number;
  }> = new SimpleEventDispatcher<{ stage: string; count: number }>();

  public readonly onConfigured: SimpleEventDispatcher<void> =
    new SimpleEventDispatcher<void>();

  public readonly onConnectionStateChange: SimpleEventDispatcher<ConnectionState> =
    new SimpleEventDispatcher<ConnectionState>();

  public readonly onError: SimpleEventDispatcher<Error> =
    new SimpleEventDispatcher<Error>();

  public readonly onNodesReceived: SimpleEventDispatcher<
    Protobuf.Mesh.NodeInfo[]
  > = new SimpleEventDispatcher<Protobuf.Mesh.NodeInfo[]>();

  constructor(meshDevice: MeshDevice) {
    this.meshDevice = meshDevice;
    this.configState = this.initializeConfigState();
    this.setupEventHandlers();
  }

  private initializeConfigState(): ConfigState {
    return {
      configuring: false,
      nodeCount: 0,
      configCount: 0,
      moduleConfigCount: 0,
      channelCount: 0,
      newNodes: [],
    };
  }

  private setupEventHandlers(): void {
    // Listen to device status changes
    this.meshDevice.events.onDeviceStatus.subscribe((status) => {
      this.handleDeviceStatus(status);
    });

    // Listen for config complete signals
    this.meshDevice.events.onConfigComplete?.subscribe?.(
      (configCompleteId: number) => {
        this.handleConfigComplete(configCompleteId);
      },
    );

    // Track incoming data during configuration
    this.meshDevice.events.onConfigPacket.subscribe(() => {
      this.configState.configCount++;
      this.onProgress.dispatch({
        stage: "config",
        count: this.configState.configCount,
      });
    });

    this.meshDevice.events.onModuleConfigPacket.subscribe(() => {
      this.configState.moduleConfigCount++;
      this.onProgress.dispatch({
        stage: "moduleConfig",
        count: this.configState.moduleConfigCount,
      });
    });

    this.meshDevice.events.onChannelPacket.subscribe(() => {
      this.configState.channelCount++;
      this.onProgress.dispatch({
        stage: "channel",
        count: this.configState.channelCount,
      });
    });

    this.meshDevice.events.onNodeInfoPacket.subscribe((nodeInfo) => {
      // During initial config, batch nodes for efficient processing
      // After config, emit immediately for real-time updates
      if (this.configState.configuring) {
        // Initial config in progress: collect for batch
        this.configState.newNodes.push(nodeInfo);
        this.configState.nodeCount++;
        this.onProgress.dispatch({
          stage: "nodeInfo",
          count: this.configState.nodeCount,
        });
      } else {
        // Config complete: emit immediately for real-time updates
        this.onNodesReceived.dispatch([nodeInfo]);
      }
    });
  }

  // Connection Lifecycle
  public async connect(): Promise<void> {
    console.log("[MeshService] Starting connection");
    this.setConnectionState(ConnectionState.CONFIGURING);
    this.configState = this.initializeConfigState();
    this.configState.configuring = true;

    // Start heartbeat for all connection types
    this.startHeartbeat();

    console.log("[MeshService] Starting configuration download");
    this.onStageStart.dispatch({ stage: "configuration" });

    try {
      await this.meshDevice.configure();
      // configComplete handler will emit nodes and mark as configured
    } catch (error) {
      console.error("[MeshService] Failed to configure:", error);
      this.onError.dispatch(error as Error);
      throw error;
    }
  }

  public disconnect(): void {
    console.log("[MeshService] Disconnecting");
    this.stopHeartbeat();
    this.setConnectionState(ConnectionState.DISCONNECTED);
    this.meshDevice.disconnect();
  }

  // Configuration Handling

  /**
   * Handler called when device signals configuration completion
   */
  private handleConfigComplete(configCompleteId: number): void {
    console.log(`[MeshService] Received configCompleteId=${configCompleteId}`);

    console.log(`[MeshService] Configuration complete`);

    this.configState.configuring = false;

    this.onStageComplete.dispatch({
      stage: "configuration",
      configCount: this.configState.configCount,
      moduleConfigCount: this.configState.moduleConfigCount,
      channelCount: this.configState.channelCount,
      nodeCount: this.configState.nodeCount,
    });

    console.log(
      `[MeshService] Emitting ${this.configState.newNodes.length} nodes for batch processing`,
    );
    // Emit batch of nodes
    this.onNodesReceived.dispatch([...this.configState.newNodes]);
    this.configState.newNodes = [];

    // Configuration complete
    this.setConnectionState(ConnectionState.CONFIGURED);
    this.onConfigured.dispatch();

    console.log(
      `[MeshService] Configuration complete. ` +
        `Configs: ${this.configState.configCount}, ` +
        `ModuleConfigs: ${this.configState.moduleConfigCount}, ` +
        `Channels: ${this.configState.channelCount}, ` +
        `Nodes: ${this.configState.nodeCount}`,
    );
  }

  // Heartbeat Management
  private startHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
    }

    this.heartbeatIntervalId = setInterval(() => {
      this.sendHeartbeat().catch((error) => {
        console.warn("[MeshService] Heartbeat failed:", error);
      });
    }, HEARTBEAT_INTERVAL_MS);

    console.log(
      `[MeshService] Heartbeat started (interval: ${HEARTBEAT_INTERVAL_MS}ms)`,
    );
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
      console.log("[MeshService] Heartbeat stopped");
    }
  }

  private async sendHeartbeat(): Promise<void> {
    try {
      await this.meshDevice.heartbeat();
      console.log("[MeshService] Heartbeat sent");
    } catch (error) {
      console.warn("[MeshService] Failed to send heartbeat:", error);
      throw error;
    }
  }

  // State Management
  private handleDeviceStatus(status: Types.DeviceStatusEnum): void {
    console.log(`[MeshService] Device status changed: ${status}`);

    // Map device status to connection state
    switch (status) {
      case Types.DeviceStatusEnum.DeviceConnected:
        if (this.connectionState === ConnectionState.DISCONNECTED) {
          this.setConnectionState(ConnectionState.CONNECTED);
        }
        break;
      case Types.DeviceStatusEnum.DeviceConfiguring:
        this.setConnectionState(ConnectionState.CONFIGURING);
        break;
      case Types.DeviceStatusEnum.DeviceConfigured:
        // Don't set to CONFIGURED yet - wait for our config flow to complete
        break;
      case Types.DeviceStatusEnum.DeviceDisconnected:
        this.setConnectionState(ConnectionState.DISCONNECTED);
        this.stopHeartbeat();
        break;
    }
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      console.log(
        `[MeshService] Connection state: ${this.connectionState} -> ${state}`,
      );
      this.connectionState = state;
      this.onConnectionStateChange.dispatch(state);
    }
  }

  // Public Methods
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  public getConfigProgress(): ConfigState {
    return { ...this.configState };
  }

  public getMeshDevice(): MeshDevice {
    return this.meshDevice;
  }

  public destroy(): void {
    console.log("[MeshService] Destroying service");
    this.stopHeartbeat();
  }
}
