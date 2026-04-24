import { fromBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import type { Logger } from "tslog";
import { Constants } from "../constants/index.ts";
import type { EventBus } from "../event-bus/EventBus.ts";
import type { Queue } from "../queue/Queue.ts";
import type { DeviceOutput } from "../transport/Transport.ts";
import { DeviceStatusEnum } from "../transport/Transport.ts";
import { ChannelNumber, Emitter, type PacketMetadata } from "../types.ts";
import type { Xmodem } from "../xmodem/Xmodem.ts";

/**
 * A minimal client-shape surface that the packet decoder writes into.
 * MeshClient and the legacy MeshDevice shim both implement this.
 */
export interface PacketSink {
  log: Logger<unknown>;
  events: EventBus;
  queue: Queue;
  xModem: Xmodem;
  configId: number;
  readonly myNodeNum: number;
  updateDeviceStatus(status: DeviceStatusEnum): void;
  configure(): Promise<number>;
}

/**
 * Writable stream that consumes framed DeviceOutput chunks, decodes FromRadio
 * protobufs, routes MeshPackets through their portnums, and dispatches typed
 * events on the provided EventBus.
 */
export const decodePacket = (sink: PacketSink): WritableStream<DeviceOutput> =>
  new WritableStream<DeviceOutput>({
    write(chunk) {
      switch (chunk.type) {
        case "status": {
          const { status, reason } = chunk.data;
          sink.updateDeviceStatus(status);
          sink.log.info(
            Emitter[Emitter.ConnectionStatus],
            `🔗 ${DeviceStatusEnum[status]} ${reason ? `(${reason})` : ""}`,
          );
          break;
        }
        case "debug": {
          break;
        }
        case "packet": {
          let decodedMessage: Protobuf.Mesh.FromRadio;
          try {
            decodedMessage = fromBinary(Protobuf.Mesh.FromRadioSchema, chunk.data);
          } catch (e) {
            sink.log.error(Emitter[Emitter.HandleFromRadio], "⚠️ Received undecodable packet", e);
            break;
          }
          sink.events.onFromRadio.dispatch(decodedMessage);

          switch (decodedMessage.payloadVariant.case) {
            case "packet": {
              try {
                handleMeshPacket(sink, decodedMessage.payloadVariant.value);
              } catch (e) {
                sink.log.error(
                  Emitter[Emitter.HandleFromRadio],
                  "⚠️ Unable to handle mesh packet",
                  e,
                );
              }
              break;
            }
            case "myInfo": {
              sink.events.onMyNodeInfo.dispatch(decodedMessage.payloadVariant.value);
              sink.log.info(
                Emitter[Emitter.HandleFromRadio],
                "📱 Received Node info for this device",
              );
              break;
            }
            case "nodeInfo": {
              sink.log.info(
                Emitter[Emitter.HandleFromRadio],
                `📱 Received Node Info packet for node: ${decodedMessage.payloadVariant.value.num}`,
              );
              sink.events.onNodeInfoPacket.dispatch(decodedMessage.payloadVariant.value);

              if (decodedMessage.payloadVariant.value.position) {
                sink.events.onPositionPacket.dispatch({
                  id: decodedMessage.id,
                  rxTime: new Date(),
                  from: decodedMessage.payloadVariant.value.num,
                  to: decodedMessage.payloadVariant.value.num,
                  type: "direct",
                  channel: ChannelNumber.Primary,
                  data: decodedMessage.payloadVariant.value.position,
                });
              }

              if (decodedMessage.payloadVariant.value.user) {
                sink.events.onUserPacket.dispatch({
                  id: decodedMessage.id,
                  rxTime: new Date(),
                  from: decodedMessage.payloadVariant.value.num,
                  to: decodedMessage.payloadVariant.value.num,
                  type: "direct",
                  channel: ChannelNumber.Primary,
                  data: decodedMessage.payloadVariant.value.user,
                });
              }
              break;
            }
            case "config": {
              if (decodedMessage.payloadVariant.value.payloadVariant.case) {
                sink.log.trace(
                  Emitter[Emitter.HandleFromRadio],
                  `💾 Received Config packet of variant: ${decodedMessage.payloadVariant.value.payloadVariant.case}`,
                );
              } else {
                sink.log.warn(
                  Emitter[Emitter.HandleFromRadio],
                  "⚠️ Received Config packet of variant: UNK",
                );
              }
              sink.events.onConfigPacket.dispatch(decodedMessage.payloadVariant.value);
              break;
            }
            case "logRecord": {
              sink.log.trace(Emitter[Emitter.HandleFromRadio], "Received onLogRecord");
              sink.events.onLogRecord.dispatch(decodedMessage.payloadVariant.value);
              break;
            }
            case "configCompleteId": {
              sink.log.info(
                Emitter[Emitter.HandleFromRadio],
                `⚙️ Received config complete id: ${decodedMessage.payloadVariant.value}`,
              );
              sink.events.onConfigComplete.dispatch(decodedMessage.payloadVariant.value);
              if (decodedMessage.payloadVariant.value === sink.configId) {
                sink.log.info(
                  Emitter[Emitter.HandleFromRadio],
                  `⚙️ Config id matches client.configId: ${sink.configId}`,
                );
                sink.updateDeviceStatus(DeviceStatusEnum.DeviceConfigured);
              }
              break;
            }
            case "rebooted": {
              sink.configure().catch(() => {
                // workaround for `wantConfigId` not getting acks
              });
              break;
            }
            case "moduleConfig": {
              if (decodedMessage.payloadVariant.value.payloadVariant.case) {
                sink.log.trace(
                  Emitter[Emitter.HandleFromRadio],
                  `💾 Received Module Config packet of variant: ${decodedMessage.payloadVariant.value.payloadVariant.case}`,
                );
              } else {
                sink.log.warn(
                  Emitter[Emitter.HandleFromRadio],
                  "⚠️ Received Module Config packet of variant: UNK",
                );
              }
              sink.events.onModuleConfigPacket.dispatch(decodedMessage.payloadVariant.value);
              break;
            }
            case "channel": {
              sink.log.trace(
                Emitter[Emitter.HandleFromRadio],
                `🔐 Received Channel: ${decodedMessage.payloadVariant.value.index}`,
              );
              sink.events.onChannelPacket.dispatch(decodedMessage.payloadVariant.value);
              break;
            }
            case "queueStatus": {
              sink.log.trace(
                Emitter[Emitter.HandleFromRadio],
                `🚧 Received Queue Status: ${decodedMessage.payloadVariant.value}`,
              );
              sink.events.onQueueStatus.dispatch(decodedMessage.payloadVariant.value);
              break;
            }
            case "xmodemPacket": {
              sink.xModem.handlePacket(decodedMessage.payloadVariant.value);
              break;
            }
            case "metadata": {
              if (
                Number.parseFloat(decodedMessage.payloadVariant.value.firmwareVersion) <
                Constants.minFwVer
              ) {
                sink.log.fatal(
                  Emitter[Emitter.HandleFromRadio],
                  `Device firmware outdated. Min supported: ${Constants.minFwVer} got: ${decodedMessage.payloadVariant.value.firmwareVersion}`,
                );
              }
              sink.log.debug(Emitter[Emitter.GetMetadata], "🏷️ Received metadata packet");
              sink.events.onDeviceMetadataPacket.dispatch({
                id: decodedMessage.id,
                rxTime: new Date(),
                from: 0,
                to: 0,
                type: "direct",
                channel: ChannelNumber.Primary,
                data: decodedMessage.payloadVariant.value,
              });
              break;
            }
            case "mqttClientProxyMessage": {
              break;
            }
            case "clientNotification": {
              sink.log.trace(
                Emitter[Emitter.HandleFromRadio],
                `📣 Received ClientNotification: ${decodedMessage.payloadVariant.value.message}`,
              );
              sink.events.onClientNotificationPacket.dispatch(decodedMessage.payloadVariant.value);
              break;
            }
            default: {
              sink.log.warn(
                Emitter[Emitter.HandleFromRadio],
                `⚠️ Unhandled payload variant: ${decodedMessage.payloadVariant.case}`,
              );
            }
          }
        }
      }
    },
  });

function handleMeshPacket(sink: PacketSink, meshPacket: Protobuf.Mesh.MeshPacket): void {
  sink.events.onMeshPacket.dispatch(meshPacket);
  if (meshPacket.from !== sink.myNodeNum) {
    sink.events.onMeshHeartbeat.dispatch(new Date());
  }

  switch (meshPacket.payloadVariant.case) {
    case "decoded": {
      handleDecodedPacket(sink, meshPacket.payloadVariant.value, meshPacket);
      break;
    }
    case "encrypted": {
      sink.log.debug(
        Emitter[Emitter.HandleMeshPacket],
        "🔐 Device received encrypted data packet, ignoring.",
      );
      break;
    }
    default:
      throw new Error(`Unhandled case ${meshPacket.payloadVariant.case}`);
  }
}

function handleDecodedPacket(
  sink: PacketSink,
  dataPacket: Protobuf.Mesh.Data,
  meshPacket: Protobuf.Mesh.MeshPacket,
) {
  const packetMetadata: Omit<PacketMetadata<unknown>, "data"> = {
    id: meshPacket.id,
    rxTime: new Date(meshPacket.rxTime * 1000),
    type: meshPacket.to === Constants.broadcastNum ? "broadcast" : "direct",
    from: meshPacket.from,
    to: meshPacket.to,
    channel: meshPacket.channel,
  };

  sink.log.trace(
    Emitter[Emitter.HandleMeshPacket],
    `📦 Received ${Protobuf.Portnums.PortNum[dataPacket.portnum]} packet`,
  );

  switch (dataPacket.portnum) {
    case Protobuf.Portnums.PortNum.TEXT_MESSAGE_APP: {
      sink.events.onMessagePacket.dispatch({
        ...packetMetadata,
        data: new TextDecoder().decode(dataPacket.payload),
      });
      break;
    }
    case Protobuf.Portnums.PortNum.REMOTE_HARDWARE_APP: {
      sink.events.onRemoteHardwarePacket.dispatch({
        ...packetMetadata,
        data: fromBinary(Protobuf.RemoteHardware.HardwareMessageSchema, dataPacket.payload),
      });
      break;
    }
    case Protobuf.Portnums.PortNum.POSITION_APP: {
      sink.events.onPositionPacket.dispatch({
        ...packetMetadata,
        data: fromBinary(Protobuf.Mesh.PositionSchema, dataPacket.payload),
      });
      break;
    }
    case Protobuf.Portnums.PortNum.NODEINFO_APP: {
      sink.events.onUserPacket.dispatch({
        ...packetMetadata,
        data: fromBinary(Protobuf.Mesh.UserSchema, dataPacket.payload),
      });
      break;
    }
    case Protobuf.Portnums.PortNum.ROUTING_APP: {
      const routingPacket = fromBinary(Protobuf.Mesh.RoutingSchema, dataPacket.payload);
      sink.events.onRoutingPacket.dispatch({ ...packetMetadata, data: routingPacket });
      switch (routingPacket.variant.case) {
        case "errorReason": {
          if (routingPacket.variant.value === Protobuf.Mesh.Routing_Error.NONE) {
            sink.queue.processAck(dataPacket.requestId);
          } else {
            sink.queue.processError({
              id: dataPacket.requestId,
              error: routingPacket.variant.value,
            });
          }
          break;
        }
        case "routeReply":
        case "routeRequest":
          break;
        default:
          throw new Error(`Unhandled case ${routingPacket.variant.case}`);
      }
      break;
    }
    case Protobuf.Portnums.PortNum.ADMIN_APP: {
      const adminMessage = fromBinary(Protobuf.Admin.AdminMessageSchema, dataPacket.payload);
      switch (adminMessage.payloadVariant.case) {
        case "getChannelResponse": {
          sink.events.onChannelPacket.dispatch(adminMessage.payloadVariant.value);
          break;
        }
        case "getOwnerResponse": {
          sink.events.onUserPacket.dispatch({
            ...packetMetadata,
            data: adminMessage.payloadVariant.value,
          });
          break;
        }
        case "getConfigResponse": {
          sink.events.onConfigPacket.dispatch(adminMessage.payloadVariant.value);
          break;
        }
        case "getModuleConfigResponse": {
          sink.events.onModuleConfigPacket.dispatch(adminMessage.payloadVariant.value);
          break;
        }
        case "getDeviceMetadataResponse": {
          sink.log.debug(
            Emitter[Emitter.GetMetadata],
            `🏷️ Received metadata packet from ${dataPacket.source}`,
          );
          sink.events.onDeviceMetadataPacket.dispatch({
            ...packetMetadata,
            data: adminMessage.payloadVariant.value,
          });
          break;
        }
        case "getCannedMessageModuleMessagesResponse": {
          sink.log.debug(
            Emitter[Emitter.GetMetadata],
            "🥫 Received CannedMessage Module Messages response packet",
          );
          sink.events.onCannedMessageModulePacket.dispatch({
            ...packetMetadata,
            data: adminMessage.payloadVariant.value,
          });
          break;
        }
        default: {
          sink.log.error(
            Emitter[Emitter.HandleMeshPacket],
            `⚠️ Received unhandled AdminMessage, type ${
              adminMessage.payloadVariant.case ?? "undefined"
            }`,
            dataPacket.payload,
          );
        }
      }
      break;
    }
    case Protobuf.Portnums.PortNum.WAYPOINT_APP: {
      sink.events.onWaypointPacket.dispatch({
        ...packetMetadata,
        data: fromBinary(Protobuf.Mesh.WaypointSchema, dataPacket.payload),
      });
      break;
    }
    case Protobuf.Portnums.PortNum.AUDIO_APP: {
      sink.events.onAudioPacket.dispatch({ ...packetMetadata, data: dataPacket.payload });
      break;
    }
    case Protobuf.Portnums.PortNum.DETECTION_SENSOR_APP: {
      sink.events.onDetectionSensorPacket.dispatch({
        ...packetMetadata,
        data: dataPacket.payload,
      });
      break;
    }
    case Protobuf.Portnums.PortNum.REPLY_APP: {
      sink.events.onPingPacket.dispatch({ ...packetMetadata, data: dataPacket.payload });
      break;
    }
    case Protobuf.Portnums.PortNum.IP_TUNNEL_APP: {
      sink.events.onIpTunnelPacket.dispatch({ ...packetMetadata, data: dataPacket.payload });
      break;
    }
    case Protobuf.Portnums.PortNum.PAXCOUNTER_APP: {
      sink.events.onPaxcounterPacket.dispatch({
        ...packetMetadata,
        data: fromBinary(Protobuf.PaxCount.PaxcountSchema, dataPacket.payload),
      });
      break;
    }
    case Protobuf.Portnums.PortNum.SERIAL_APP: {
      sink.events.onSerialPacket.dispatch({ ...packetMetadata, data: dataPacket.payload });
      break;
    }
    case Protobuf.Portnums.PortNum.STORE_FORWARD_APP: {
      sink.events.onStoreForwardPacket.dispatch({ ...packetMetadata, data: dataPacket.payload });
      break;
    }
    case Protobuf.Portnums.PortNum.RANGE_TEST_APP: {
      sink.events.onRangeTestPacket.dispatch({ ...packetMetadata, data: dataPacket.payload });
      break;
    }
    case Protobuf.Portnums.PortNum.TELEMETRY_APP: {
      sink.events.onTelemetryPacket.dispatch({
        ...packetMetadata,
        data: fromBinary(Protobuf.Telemetry.TelemetrySchema, dataPacket.payload),
      });
      break;
    }
    case Protobuf.Portnums.PortNum.ZPS_APP: {
      sink.events.onZpsPacket.dispatch({ ...packetMetadata, data: dataPacket.payload });
      break;
    }
    case Protobuf.Portnums.PortNum.SIMULATOR_APP: {
      sink.events.onSimulatorPacket.dispatch({ ...packetMetadata, data: dataPacket.payload });
      break;
    }
    case Protobuf.Portnums.PortNum.TRACEROUTE_APP: {
      sink.events.onTraceRoutePacket.dispatch({
        ...packetMetadata,
        data: fromBinary(Protobuf.Mesh.RouteDiscoverySchema, dataPacket.payload),
      });
      break;
    }
    case Protobuf.Portnums.PortNum.NEIGHBORINFO_APP: {
      sink.events.onNeighborInfoPacket.dispatch({
        ...packetMetadata,
        data: fromBinary(Protobuf.Mesh.NeighborInfoSchema, dataPacket.payload),
      });
      break;
    }
    case Protobuf.Portnums.PortNum.ATAK_PLUGIN: {
      sink.events.onAtakPluginPacket.dispatch({ ...packetMetadata, data: dataPacket.payload });
      break;
    }
    case Protobuf.Portnums.PortNum.MAP_REPORT_APP: {
      sink.events.onMapReportPacket.dispatch({ ...packetMetadata, data: dataPacket.payload });
      break;
    }
    case Protobuf.Portnums.PortNum.PRIVATE_APP: {
      sink.events.onPrivatePacket.dispatch({ ...packetMetadata, data: dataPacket.payload });
      break;
    }
    case Protobuf.Portnums.PortNum.ATAK_FORWARDER: {
      sink.events.onAtakForwarderPacket.dispatch({ ...packetMetadata, data: dataPacket.payload });
      break;
    }
    default:
      throw new Error(`Unhandled case ${dataPacket.portnum}`);
  }
}
