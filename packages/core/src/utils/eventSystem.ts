import type * as Protobuf from "@meshtastic/protobufs";
import { SimpleEventDispatcher } from "ste-simple-events";
import type * as Types from "../types.ts";
import type { PacketMetadata } from "../types.ts";

export class EventSystem {
  /**
   * Fires when a new FromRadio message has been received from the device
   *
   * @event onLogEvent
   */
  public readonly onLogEvent: SimpleEventDispatcher<Types.LogEventPacket> =
    new SimpleEventDispatcher<Types.LogEventPacket>();

  /**
   * Fires when a new FromRadio message has been received from the device
   *
   * @event onFromRadio
   */
  public readonly onFromRadio: SimpleEventDispatcher<Protobuf.Mesh.FromRadio> =
    new SimpleEventDispatcher<Protobuf.Mesh.FromRadio>();

  /**
   * Fires when a new FromRadio message containing a Data packet has been
   * received from the device
   *
   * @event onMeshPacket
   */
  public readonly onMeshPacket: SimpleEventDispatcher<Protobuf.Mesh.MeshPacket> =
    new SimpleEventDispatcher<Protobuf.Mesh.MeshPacket>();

  /**
   * Fires when a new MyNodeInfo message has been received from the device
   *
   * @event onMyNodeInfo
   */
  public readonly onMyNodeInfo: SimpleEventDispatcher<Protobuf.Mesh.MyNodeInfo> =
    new SimpleEventDispatcher<Protobuf.Mesh.MyNodeInfo>();

  /**
   * Fires when a new MeshPacket message containing a NodeInfo packet has been
   * received from device
   *
   * @event onNodeInfoPacket
   */
  public readonly onNodeInfoPacket: SimpleEventDispatcher<Protobuf.Mesh.NodeInfo> =
    new SimpleEventDispatcher<Protobuf.Mesh.NodeInfo>();

  /**
   * Fires when a new Channel message is received
   *
   * @event onChannelPacket
   */
  public readonly onChannelPacket: SimpleEventDispatcher<Protobuf.Channel.Channel> =
    new SimpleEventDispatcher<Protobuf.Channel.Channel>();

  /**
   * Fires when a new Config message is received
   *
   * @event onConfigPacket
   */
  public readonly onConfigPacket: SimpleEventDispatcher<Protobuf.Config.Config> =
    new SimpleEventDispatcher<Protobuf.Config.Config>();

  /**
   * Fires when a new ModuleConfig message is received
   *
   * @event onModuleConfigPacket
   */
  public readonly onModuleConfigPacket: SimpleEventDispatcher<Protobuf.ModuleConfig.ModuleConfig> =
    new SimpleEventDispatcher<Protobuf.ModuleConfig.ModuleConfig>();

  /**
   * Fires when a new MeshPacket message containing a ATAK packet has been
   * received from device
   *
   * @event onAtakPacket
   */
  public readonly onAtakPacket: SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  > = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();

  /**
   * Fires when a new MeshPacket message containing a Text packet has been
   * received from device
   *
   * @event onMessagePacket
   */
  public readonly onMessagePacket: SimpleEventDispatcher<
    PacketMetadata<string>
  > = new SimpleEventDispatcher<PacketMetadata<string>>();

  /**
   * Fires when a new MeshPacket message containing a Remote Hardware packet has
   * been received from device
   *
   * @event onRemoteHardwarePacket
   */
  public readonly onRemoteHardwarePacket: SimpleEventDispatcher<
    PacketMetadata<Protobuf.RemoteHardware.HardwareMessage>
  > = new SimpleEventDispatcher<
    PacketMetadata<Protobuf.RemoteHardware.HardwareMessage>
  >();

  /**
   * Fires when a new MeshPacket message containing a Position packet has been
   * received from device
   *
   * @event onPositionPacket
   */
  public readonly onPositionPacket: SimpleEventDispatcher<
    PacketMetadata<Protobuf.Mesh.Position>
  > = new SimpleEventDispatcher<PacketMetadata<Protobuf.Mesh.Position>>();

  /**
   * Fires when a new MeshPacket message containing a User packet has been
   * received from device
   *
   * @event onUserPacket
   */
  public readonly onUserPacket: SimpleEventDispatcher<
    PacketMetadata<Protobuf.Mesh.User>
  > = new SimpleEventDispatcher<PacketMetadata<Protobuf.Mesh.User>>();

  /**
   * Fires when a new MeshPacket message containing a Routing packet has been
   * received from device
   *
   * @event onRoutingPacket
   */
  public readonly onRoutingPacket: SimpleEventDispatcher<
    PacketMetadata<Protobuf.Mesh.Routing>
  > = new SimpleEventDispatcher<PacketMetadata<Protobuf.Mesh.Routing>>();

  /**
   * Fires when the device receives a Metadata packet
   *
   * @event onDeviceMetadataPacket
   */
  public readonly onDeviceMetadataPacket: SimpleEventDispatcher<
    PacketMetadata<Protobuf.Mesh.DeviceMetadata>
  > = new SimpleEventDispatcher<PacketMetadata<Protobuf.Mesh.DeviceMetadata>>();

  /**
   * Fires when the device receives a Canned Message Module message packet
   *
   * @event onCannedMessageModulePacket
   */
  public readonly onCannedMessageModulePacket: SimpleEventDispatcher<
    PacketMetadata<string>
  > = new SimpleEventDispatcher<PacketMetadata<string>>();

  /**
   * Fires when a new MeshPacket message containing a Waypoint packet has been
   * received from device
   *
   * @event onWaypointPacket
   */
  public readonly onWaypointPacket: SimpleEventDispatcher<
    PacketMetadata<Protobuf.Mesh.Waypoint>
  > = new SimpleEventDispatcher<PacketMetadata<Protobuf.Mesh.Waypoint>>();

  /**
   * Fires when a new MeshPacket message containing an Audio packet has been
   * received from device
   *
   * @event onAudioPacket
   */
  public readonly onAudioPacket: SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  > = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();

  /**
   * Fires when a new MeshPacket message containing a Detection Sensor packet has been
   * received from device
   *
   * @event onDetectionSensorPacket
   */
  public readonly onDetectionSensorPacket: SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  > = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();

  /**
   * Fires when a new MeshPacket message containing a Ping packet has been
   * received from device
   *
   * @event onPingPacket
   */
  public readonly onPingPacket: SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  > = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();

  /**
   * Fires when a new MeshPacket message containing a IP Tunnel packet has been
   * received from device
   *
   * @event onIpTunnelPacket
   */
  public readonly onIpTunnelPacket: SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  > = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();

  /**
   * Fires when a new MeshPacket message containing a Paxcounter packet has been
   * received from device
   *
   * @event onPaxcounterPacket
   */
  public readonly onPaxcounterPacket: SimpleEventDispatcher<
    PacketMetadata<Protobuf.PaxCount.Paxcount>
  > = new SimpleEventDispatcher<PacketMetadata<Protobuf.PaxCount.Paxcount>>();

  /**
   * Fires when a new MeshPacket message containing a Serial packet has been
   * received from device
   *
   * @event onSerialPacket
   */
  public readonly onSerialPacket: SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  > = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();

  /**
   * Fires when a new MeshPacket message containing a Store and Forward packet
   * has been received from device
   *
   * @event onStoreForwardPacket
   */
  public readonly onStoreForwardPacket: SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  > = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();

  /**
   * Fires when a new MeshPacket message containing a Store and Forward packet
   * has been received from device
   *
   * @event onRangeTestPacket
   */
  public readonly onRangeTestPacket: SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  > = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();

  /**
   * Fires when a new MeshPacket message containing a Telemetry packet has been
   * received from device
   *
   * @event onTelemetryPacket
   */
  public readonly onTelemetryPacket: SimpleEventDispatcher<
    PacketMetadata<Protobuf.Telemetry.Telemetry>
  > = new SimpleEventDispatcher<PacketMetadata<Protobuf.Telemetry.Telemetry>>();

  /**
   * Fires when a new MeshPacket message containing a ZPS packet has been
   * received from device
   *
   * @event onZPSPacket
   */
  public readonly onZpsPacket: SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  > = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();

  /**
   * Fires when a new MeshPacket message containing a Simulator packet has been
   * received from device
   *
   * @event onSimulatorPacket
   */
  public readonly onSimulatorPacket: SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  > = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();

  /**
   * Fires when a new MeshPacket message containing a Trace Route packet has been
   * received from device
   *
   * @event onTraceRoutePacket
   */
  public readonly onTraceRoutePacket: SimpleEventDispatcher<
    PacketMetadata<Protobuf.Mesh.RouteDiscovery>
  > = new SimpleEventDispatcher<PacketMetadata<Protobuf.Mesh.RouteDiscovery>>();

  /**
   * Fires when a new MeshPacket message containing a Neighbor Info packet has been
   * received from device
   *
   * @event onNeighborInfoPacket
   */
  public readonly onNeighborInfoPacket: SimpleEventDispatcher<
    PacketMetadata<Protobuf.Mesh.NeighborInfo>
  > = new SimpleEventDispatcher<PacketMetadata<Protobuf.Mesh.NeighborInfo>>();

  /**
   * Fires when a new MeshPacket message containing an ATAK packet has been
   * received from device
   *
   * @event onAtakPluginPacket
   */
  public readonly onAtakPluginPacket: SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  > = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();

  /**
   * Fires when a new MeshPacket message containing a Map Report packet has been
   * received from device
   *
   * @event onMapReportPacket
   */
  public readonly onMapReportPacket: SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  > = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();

  /**
   * Fires when a new MeshPacket message containing a Private packet has been
   * received from device
   *
   * @event onPrivatePacket
   */
  public readonly onPrivatePacket: SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  > = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();

  /**
   * Fires when a new MeshPacket message containing an ATAK Forwarder packet has been
   * received from device
   *
   * @event onAtakForwarderPacket
   */
  public readonly onAtakForwarderPacket: SimpleEventDispatcher<
    PacketMetadata<Uint8Array>
  > = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();

  /**
   * Fires when a new MeshPacket message containing a ClientNotification packet has been
   * received from device
   *
   * @event onClientNotificationPacket
   */
  public readonly onClientNotificationPacket: SimpleEventDispatcher<Protobuf.Mesh.ClientNotification> =
    new SimpleEventDispatcher<Protobuf.Mesh.ClientNotification>();

  /**
   * Fires when the devices connection or configuration status changes
   *
   * @event onDeviceStatus
   */
  public readonly onDeviceStatus: SimpleEventDispatcher<Types.DeviceStatusEnum> =
    new SimpleEventDispatcher<Types.DeviceStatusEnum>();

  /**
   * Fires when a new FromRadio message containing a LogRecord packet has been
   * received from device
   *
   * @event onLogRecord
   */
  public readonly onLogRecord: SimpleEventDispatcher<Protobuf.Mesh.LogRecord> =
    new SimpleEventDispatcher<Protobuf.Mesh.LogRecord>();

  /**
   * Fires when the device receives a meshPacket, returns a timestamp
   *
   * @event onMeshHeartbeat
   */
  public readonly onMeshHeartbeat: SimpleEventDispatcher<Date> =
    new SimpleEventDispatcher<Date>();

  /**
   * Outputs any debug log data (currently serial connections only)
   *
   * @event onDeviceDebugLog
   */
  public readonly onDeviceDebugLog: SimpleEventDispatcher<Uint8Array> =
    new SimpleEventDispatcher<Uint8Array>();

  /**
   * Outputs status of pending settings changes
   *
   * @event onpendingSettingsChange
   */
  public readonly onPendingSettingsChange: SimpleEventDispatcher<boolean> =
    new SimpleEventDispatcher<boolean>();

  /**
   * Fires when a QueueStatus message is generated
   *
   * @event onQueueStatus
   */
  public readonly onQueueStatus: SimpleEventDispatcher<Protobuf.Mesh.QueueStatus> =
    new SimpleEventDispatcher<Protobuf.Mesh.QueueStatus>();
}
