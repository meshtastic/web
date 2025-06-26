import { fromBinary } from "@bufbuild/protobuf";
import type { DeviceOutput } from "../../types.ts";
import { Constants, Protobuf, Types } from "../../../mod.ts";
import type { MeshDevice } from "../../../mod.ts";

export const decodePacket = (device: MeshDevice) =>
  new WritableStream<DeviceOutput>({
    write(chunk) {
      switch (chunk.type) {
        case "debug": {
          break;
        }
        case "packet": {
          const decodedMessage = fromBinary(
            Protobuf.Mesh.FromRadioSchema,
            chunk.data,
          );
          device.events.onFromRadio.dispatch(decodedMessage);

          /** @todo Add map here when `all=true` gets fixed. */
          switch (decodedMessage.payloadVariant.case) {
            case "packet": {
              device.handleMeshPacket(decodedMessage.payloadVariant.value);
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
              if (decodedMessage.payloadVariant.value !== device.configId) {
                device.log.error(
                  Types.Emitter[Types.Emitter.HandleFromRadio],
                  `❌ Invalid config id received from device, expected ${device.configId} but received ${decodedMessage.payloadVariant.value}`,
                );
              }

              device.log.info(
                Types.Emitter[Types.Emitter.HandleFromRadio],
                `⚙️ Valid config id received from device: ${device.configId}`,
              );

              device.updateDeviceStatus(
                Types.DeviceStatusEnum.DeviceConfigured,
              );
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
              device.log.trace(
                Types.Emitter[Types.Emitter.HandleFromRadio],
                `🚧 Received Queue Status: ${decodedMessage.payloadVariant.value}`,
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
              });
              break;
            }

            case "mqttClientProxyMessage": {
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
