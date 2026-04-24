import type * as Protobuf from "@meshtastic/protobufs";
import { SimpleEventDispatcher } from "ste-simple-events";
import type { DeviceStatusEnum } from "../transport/Transport.ts";
import type { LogEventPacket, PacketMetadata } from "../types.ts";

/**
 * Typed event bus. Ports the former `EventSystem` into the SDK.
 *
 * Slice infrastructure subscribes here and materializes signals. External code
 * should prefer slice stores over raw bus subscriptions.
 */
export class EventBus {
  public readonly onLogEvent = new SimpleEventDispatcher<LogEventPacket>();
  public readonly onFromRadio = new SimpleEventDispatcher<Protobuf.Mesh.FromRadio>();
  public readonly onMeshPacket = new SimpleEventDispatcher<Protobuf.Mesh.MeshPacket>();
  public readonly onMyNodeInfo = new SimpleEventDispatcher<Protobuf.Mesh.MyNodeInfo>();
  public readonly onNodeInfoPacket = new SimpleEventDispatcher<Protobuf.Mesh.NodeInfo>();
  public readonly onChannelPacket = new SimpleEventDispatcher<Protobuf.Channel.Channel>();
  public readonly onConfigPacket = new SimpleEventDispatcher<Protobuf.Config.Config>();
  public readonly onModuleConfigPacket =
    new SimpleEventDispatcher<Protobuf.ModuleConfig.ModuleConfig>();
  public readonly onAtakPacket = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();
  public readonly onMessagePacket = new SimpleEventDispatcher<PacketMetadata<string>>();
  public readonly onRemoteHardwarePacket = new SimpleEventDispatcher<
    PacketMetadata<Protobuf.RemoteHardware.HardwareMessage>
  >();
  public readonly onPositionPacket = new SimpleEventDispatcher<
    PacketMetadata<Protobuf.Mesh.Position>
  >();
  public readonly onUserPacket = new SimpleEventDispatcher<PacketMetadata<Protobuf.Mesh.User>>();
  public readonly onRoutingPacket = new SimpleEventDispatcher<
    PacketMetadata<Protobuf.Mesh.Routing>
  >();
  public readonly onDeviceMetadataPacket = new SimpleEventDispatcher<
    PacketMetadata<Protobuf.Mesh.DeviceMetadata>
  >();
  public readonly onCannedMessageModulePacket = new SimpleEventDispatcher<PacketMetadata<string>>();
  public readonly onWaypointPacket = new SimpleEventDispatcher<
    PacketMetadata<Protobuf.Mesh.Waypoint>
  >();
  public readonly onAudioPacket = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();
  public readonly onDetectionSensorPacket = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();
  public readonly onPingPacket = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();
  public readonly onIpTunnelPacket = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();
  public readonly onPaxcounterPacket = new SimpleEventDispatcher<
    PacketMetadata<Protobuf.PaxCount.Paxcount>
  >();
  public readonly onSerialPacket = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();
  public readonly onStoreForwardPacket = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();
  public readonly onRangeTestPacket = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();
  public readonly onTelemetryPacket = new SimpleEventDispatcher<
    PacketMetadata<Protobuf.Telemetry.Telemetry>
  >();
  public readonly onZpsPacket = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();
  public readonly onSimulatorPacket = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();
  public readonly onTraceRoutePacket = new SimpleEventDispatcher<
    PacketMetadata<Protobuf.Mesh.RouteDiscovery>
  >();
  public readonly onNeighborInfoPacket = new SimpleEventDispatcher<
    PacketMetadata<Protobuf.Mesh.NeighborInfo>
  >();
  public readonly onAtakPluginPacket = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();
  public readonly onMapReportPacket = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();
  public readonly onPrivatePacket = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();
  public readonly onAtakForwarderPacket = new SimpleEventDispatcher<PacketMetadata<Uint8Array>>();
  public readonly onClientNotificationPacket =
    new SimpleEventDispatcher<Protobuf.Mesh.ClientNotification>();
  public readonly onDeviceStatus = new SimpleEventDispatcher<DeviceStatusEnum>();
  public readonly onLogRecord = new SimpleEventDispatcher<Protobuf.Mesh.LogRecord>();
  public readonly onMeshHeartbeat = new SimpleEventDispatcher<Date>();
  public readonly onDeviceDebugLog = new SimpleEventDispatcher<Uint8Array>();
  public readonly onPendingSettingsChange = new SimpleEventDispatcher<boolean>();
  public readonly onQueueStatus = new SimpleEventDispatcher<Protobuf.Mesh.QueueStatus>();
  public readonly onConfigComplete = new SimpleEventDispatcher<number>();
}
