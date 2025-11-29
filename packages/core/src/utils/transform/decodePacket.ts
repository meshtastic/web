import { fromBinary } from "@bufbuild/protobuf";
import type { MeshDevice } from "../../../mod.ts";
import { Constants, Protobuf, Types } from "../../../mod.ts";
import type { DeviceOutput } from "../../types.ts";

export const decodePacket = (device: MeshDevice) =>
  new WritableStream<DeviceOutput>({
    write(chunk) {
      switch (chunk.type) {
        case "status": {
          const { status, reason } = chunk.data as {
            status: Types.DeviceStatusEnum;
            reason?: string;
          };

          device.updateDeviceStatus(status);
          device.log.info(
            Types.Emitter[Types.Emitter.ConnectionStatus],
            `🔗 ${Types.DeviceStatusEnum[status]} ${reason ? `(${reason})` : ""}`,
          );
          break;
        }
        case "debug": {
          break;
        }
        case "packet": {
          let decodedMessage: Protobuf.Mesh.FromRadio;
          try {
            decodedMessage = fromBinary(
              Protobuf.Mesh.FromRadioSchema,
              chunk.data,
            );
          } catch (e) {
            device.log.error(
              Types.Emitter[Types.Emitter.HandleFromRadio],
              "⚠️  Received undecodable packet",
              e,
            );
            break;
          }
          device.events.onFromRadio.dispatch(decodedMessage);

          /** @todo Add map here when `all=true` gets fixed. */
          switch (decodedMessage.payloadVariant.case) {
            case "packet": {
              try {
                device.handleMeshPacket(decodedMessage.payloadVariant.value);
              } catch (e) {
                device.log.error(
                  Types.Emitter[Types.Emitter.HandleFromRadio],
                  "⚠️  Unable to handle mesh packet",
                  e,
                );
              }
              break;
            }

            case "myInfo": {
              device.events.onMyNodeInfo.dispatch(
                decodedMessage.payloadVariant.value,
              );
              device.log.info(
                Types.Emitter[Types.Emitter.HandleFromRadio],
                "📱 Received Node info for this device",
              );
              break;
            }

            case "nodeInfo": {
              device.log.info(
                Types.Emitter[Types.Emitter.HandleFromRadio],
                `📱 Received Node Info packet for node: ${decodedMessage.payloadVariant.value.num}`,
              );

              device.events.onNodeInfoPacket.dispatch(
                decodedMessage.payloadVariant.value,
              );

              //TODO: HERE
              if (decodedMessage.payloadVariant.value.position) {
                device.events.onPositionPacket.dispatch({
                  id: decodedMessage.id,
                  rxTime: new Date(),
                  from: decodedMessage.payloadVariant.value.num,
                  to: decodedMessage.payloadVariant.value.num,
                  type: "direct",
                  channel: Types.ChannelNumber.Primary,
                  data: decodedMessage.payloadVariant.value.position,
                  hops: 0,
                  rxRssi: 0,
                  rxSnr: 0,
                  viaMqtt: false,
                });
              }

              //TODO: HERE
              if (decodedMessage.payloadVariant.value.user) {
                device.events.onUserPacket.dispatch({
                  id: decodedMessage.id,
                  rxTime: new Date(),
                  from: decodedMessage.payloadVariant.value.num,
                  to: decodedMessage.payloadVariant.value.num,
                  type: "direct",
                  channel: Types.ChannelNumber.Primary,
                  data: decodedMessage.payloadVariant.value.user,
                  hops: 0,
                  rxRssi: 0,
                  rxSnr: 0,
                  viaMqtt: false,
                });
              }
              break;
            }

            case "config": {
              if (decodedMessage.payloadVariant.value.payloadVariant.case) {
                device.log.trace(
                  Types.Emitter[Types.Emitter.HandleFromRadio],
                  `💾 Received Config packet of variant: ${decodedMessage.payloadVariant.value.payloadVariant.case}`,
                );
              } else {
                device.log.warn(
                  Types.Emitter[Types.Emitter.HandleFromRadio],
                  `⚠️ Received Config packet of variant: ${"UNK"}`,
                );
              }

              device.events.onConfigPacket.dispatch(
                decodedMessage.payloadVariant.value,
              );
              break;
            }

            case "logRecord": {
              device.log.trace(
                Types.Emitter[Types.Emitter.HandleFromRadio],
                "Received onLogRecord",
              );
              device.events.onLogRecord.dispatch(
                decodedMessage.payloadVariant.value,
              );
              break;
            }

            case "configCompleteId": {
              device.log.info(
                Types.Emitter[Types.Emitter.HandleFromRadio],
                `⚙️ Received config complete id: ${decodedMessage.payloadVariant.value}`,
              );

              // Emit the configCompleteId event for MeshService to handle two-stage flow
              device.events.onConfigComplete.dispatch(
                decodedMessage.payloadVariant.value,
              );

              // For backward compatibility: if configId matches, update device status
              // MeshService will override this behavior for two-stage flow
              if (decodedMessage.payloadVariant.value === device.configId) {
                device.log.info(
                  Types.Emitter[Types.Emitter.HandleFromRadio],
                  `⚙️ Config id matches device.configId: ${device.configId}`,
                );
                device.updateDeviceStatus(
                  Types.DeviceStatusEnum.DeviceConfigured,
                );
              }
              break;
            }

            case "rebooted": {
              device.configure().catch(() => {
                // TODO: FIX, workaround for `wantConfigId` not getting acks.
              });
              break;
            }

            case "moduleConfig": {
              if (decodedMessage.payloadVariant.value.payloadVariant.case) {
                device.log.trace(
                  Types.Emitter[Types.Emitter.HandleFromRadio],
                  `💾 Received Module Config packet of variant: ${decodedMessage.payloadVariant.value.payloadVariant.case}`,
                );
              } else {
                device.log.warn(
                  Types.Emitter[Types.Emitter.HandleFromRadio],
                  "⚠️ Received Module Config packet of variant: UNK",
                );
              }

              device.events.onModuleConfigPacket.dispatch(
                decodedMessage.payloadVariant.value,
              );
              break;
            }

            case "channel": {
              device.log.trace(
                Types.Emitter[Types.Emitter.HandleFromRadio],
                `🔐 Received Channel: ${decodedMessage.payloadVariant.value.index}`,
              );

              device.events.onChannelPacket.dispatch(
                decodedMessage.payloadVariant.value,
              );
              break;
            }

            case "queueStatus": {
              // @ts-expect-error
              delete decodedMessage.payloadVariant.value.$typeName;
              device.log.trace(
                Types.Emitter[Types.Emitter.HandleFromRadio],
                `🚧 Received Queue Status: ${JSON.stringify(decodedMessage.payloadVariant.value)}`,
              );

              device.events.onQueueStatus.dispatch(
                decodedMessage.payloadVariant.value,
              );
              break;
            }

            case "xmodemPacket": {
              device.xModem.handlePacket(decodedMessage.payloadVariant.value);
              break;
            }

            case "metadata": {
              if (
                Number.parseFloat(
                  decodedMessage.payloadVariant.value.firmwareVersion,
                ) < Constants.minFwVer
              ) {
                device.log.fatal(
                  Types.Emitter[Types.Emitter.HandleFromRadio],
                  `Device firmware outdated. Min supported: ${Constants.minFwVer} got : ${decodedMessage.payloadVariant.value.firmwareVersion}`,
                );
              }
              device.log.debug(
                Types.Emitter[Types.Emitter.GetMetadata],
                "🏷️ Received metadata packet",
              );

              device.events.onDeviceMetadataPacket.dispatch({
                id: decodedMessage.id,
                rxTime: new Date(),
                from: 0,
                to: 0,
                type: "direct",
                channel: Types.ChannelNumber.Primary,
                data: decodedMessage.payloadVariant.value,
                hops: 0,
                rxRssi: 0,
                rxSnr: 0,
                viaMqtt: false,
              });
              break;
            }

            case "mqttClientProxyMessage": {
              break;
            }

            case "clientNotification": {
              device.log.trace(
                Types.Emitter[Types.Emitter.HandleFromRadio],
                `📣 Received ClientNotification: ${decodedMessage.payloadVariant.value.message}`,
              );

              device.events.onClientNotificationPacket.dispatch(
                decodedMessage.payloadVariant.value,
              );
              break;
            }

            case "deviceuiConfig": {
              // @ts-expect-error
              delete decodedMessage.payloadVariant.value.$typeName;
              device.log.trace(
                Types.Emitter[Types.Emitter.HandleFromRadio],
                `🔧 Received deviceuiConfig: ${JSON.stringify(decodedMessage.payloadVariant.value)}`,
              );
              break;
            }

            default: {
              device.log.warn(
                Types.Emitter[Types.Emitter.HandleFromRadio],
                `⚠️ Unhandled payload variant: ${decodedMessage.payloadVariant.case}`,
              );
            }
          }
        }
      }
    },
  });
