import { connType } from '@core/slices/appSlice';
import {
  addChannel,
  addChat,
  addLogEvent,
  addMessage,
  addNode,
  addPosition,
  addUser,
  resetState,
  setConfig,
  setDeviceStatus,
  setLastMeshInterraction,
  setModuleConfig,
  setMyNodeInfo,
  setReady,
  updateLastInteraction,
} from '@core/slices/meshtasticSlice';
import { store } from '@core/store';
import {
  IBLEConnection,
  IHTTPConnection,
  ISerialConnection,
  Protobuf,
  SettingsManager,
  Types,
} from '@meshtastic/meshtasticjs';

type connectionType = IBLEConnection | IHTTPConnection | ISerialConnection;

export let connection: connectionType = new IHTTPConnection();

const appState = store.getState().app;

export const connectionUrl = appState.connectionParams.HTTP.address;

export const setConnection = async (conn: connType): Promise<void> => {
  await connection.disconnect();
  cleanupListeners();
  switch (conn) {
    case connType.HTTP:
      connection = new IHTTPConnection();
      break;
    case connType.BLE:
      connection = new IBLEConnection();
      break;
    case connType.SERIAL:
      connection = new ISerialConnection();
      break;
  }
  registerListeners();
  const connectionParams = store.getState().app.connectionParams;
  console.log(connectionParams);

  switch (conn) {
    case connType.HTTP:
      await connection.connect(connectionParams.HTTP);
      break;
    case connType.BLE:
      await connection.connect(
        // @ts-ignore tmp
        connectionParams.BLE,
      );
      break;
    case connType.SERIAL:
      await connection.connect(
        // @ts-ignore tmp
        connectionParams.SERIAL,
      );
      break;
  }
};

export const cleanupListeners = (): void => {
  connection.onMeshPacket.cancelAll();
  connection.onDeviceStatus.cancelAll();
  connection.onMyNodeInfo.cancelAll();
  connection.onUserPacket.cancelAll();
  connection.onPositionPacket.cancelAll();
  connection.onNodeInfoPacket.cancelAll();
  connection.onAdminPacket.cancelAll();
  connection.onMeshHeartbeat.cancelAll();
  connection.onTextPacket.cancelAll();
};

const registerListeners = (): void => {
  SettingsManager.debugMode = Protobuf.LogRecord_Level.TRACE;

  connection.onLogEvent.subscribe((log) => {
    store.dispatch(addLogEvent(log));
  });

  connection.onDeviceStatus.subscribe((status) => {
    store.dispatch(setDeviceStatus(status));

    if (status === Types.DeviceStatusEnum.DEVICE_CONFIGURED) {
      store.dispatch(setReady(true));
      void connection.getConfig(Protobuf.AdminMessage_ConfigType.DEVICE_CONFIG);
      void connection.getConfig(Protobuf.AdminMessage_ConfigType.WIFI_CONFIG);
      void connection.getConfig(
        Protobuf.AdminMessage_ConfigType.POSITION_CONFIG,
      );
      void connection.getConfig(
        Protobuf.AdminMessage_ConfigType.DISPLAY_CONFIG,
      );
      void connection.getConfig(Protobuf.AdminMessage_ConfigType.LORA_CONFIG);
      void connection.getConfig(Protobuf.AdminMessage_ConfigType.POWER_CONFIG);
    }
    if (status === Types.DeviceStatusEnum.DEVICE_DISCONNECTED) {
      store.dispatch(setReady(false));
      store.dispatch(resetState());
      cleanupListeners();
    }
  });

  connection.onMyNodeInfo.subscribe((nodeInfo) => {
    store.dispatch(setMyNodeInfo(nodeInfo));
  });

  connection.onUserPacket.subscribe((user) => {
    store.dispatch(addUser(user));
  });

  connection.onPositionPacket.subscribe((position) => {
    store.dispatch(addPosition(position));
  });

  connection.onNodeInfoPacket.subscribe(
    (nodeInfoPacket): void | { payload: Protobuf.NodeInfo; type: string } => {
      store.dispatch(addNode(nodeInfoPacket.data));
      store.dispatch(addChat(nodeInfoPacket.data.num));
    },
  );

  connection.onAdminPacket.subscribe((adminPacket) => {
    console.log(adminPacket.data.variant.oneofKind);

    switch (adminPacket.data.variant.oneofKind) {
      case 'getChannelResponse':
        store.dispatch(addChannel(adminPacket.data.variant.getChannelResponse));
        store.dispatch(
          addChat(adminPacket.data.variant.getChannelResponse.index),
        );
        break;
      case 'getOwnerResponse':
        store.dispatch(
          addUser({
            data: adminPacket.data.variant.getOwnerResponse,
            packet: adminPacket.packet,
          }),
        );
        break;
      case 'getConfigResponse':
        store.dispatch(setConfig(adminPacket.data.variant.getConfigResponse));
        break;
      case 'getModuleConfigResponse':
        store.dispatch(
          setModuleConfig(adminPacket.data.variant.getModuleConfigResponse),
        );
        break;
    }
  });

  connection.onMeshHeartbeat.subscribe(
    (date): void | { payload: number; type: string } =>
      store.dispatch(setLastMeshInterraction(date.getTime())),
  );

  connection.onRoutingPacket.subscribe((routingPacket) => {
    console.log(routingPacket.data.variant.oneofKind);

    switch (routingPacket.data.variant.oneofKind) {
      case 'errorReason':
        console.log(
          Protobuf.Routing_Error[routingPacket.data.variant.errorReason],
        );

        break;

      default:
        break;
    }

    store.dispatch(
      updateLastInteraction({
        id: routingPacket.packet.from,
        time: new Date(routingPacket.packet.rxTime * 1000),
      }),
    );
  });

  connection.onTextPacket.subscribe((message) => {
    const myNodeNum = store.getState().meshtastic.radio.hardware.myNodeNum;

    store.dispatch(
      addMessage({
        message: message,
        ack: message.packet.from !== myNodeNum,
        received: message.packet.rxTime
          ? new Date(message.packet.rxTime * 1000)
          : new Date(),
      }),
    );
  });
};
