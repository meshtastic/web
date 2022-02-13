import { connType } from '@core/slices/appSlice';
import {
  addChannel,
  addChat,
  addMessage,
  addNode,
  addPosition,
  addRoute,
  addUser,
  resetState,
  setDeviceStatus,
  setLastMeshInterraction,
  setMyNodeInfo,
  setPreferences,
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

const state = store.getState().meshtastic;
export const connectionUrl = state.hostOverrideEnabled
  ? state.hostOverride
  : import.meta.env.PROD
  ? window.location.hostname
  : (import.meta.env.VITE_PUBLIC_DEVICE_IP as string) ?? 'meshtastic.local';

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

  connection.onMeshPacket.subscribe((packet) => {
    store.dispatch(
      addRoute({
        from: packet.from,
        to:
          packet.to === 0xffffffff
            ? store.getState().meshtastic.radio.hardware.myNodeNum
            : packet.to,
        hops: packet.hopLimit,
      }),
    );
  });

  connection.onDeviceStatus.subscribe((status) => {
    store.dispatch(setDeviceStatus(status));

    if (status === Types.DeviceStatusEnum.DEVICE_CONFIGURED) {
      store.dispatch(setReady(true));
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
    switch (adminPacket.data.variant.oneofKind) {
      case 'getChannelResponse':
        store.dispatch(addChannel(adminPacket.data.variant.getChannelResponse));
        store.dispatch(
          addChat(adminPacket.data.variant.getChannelResponse.index),
        );
        break;
      case 'getRadioResponse':
        if (adminPacket.data.variant.getRadioResponse.preferences) {
          store.dispatch(
            setPreferences(
              adminPacket.data.variant.getRadioResponse.preferences,
            ),
          );
        }
        break;
    }
  });

  connection.onMeshHeartbeat.subscribe(
    (date): void | { payload: number; type: string } =>
      store.dispatch(setLastMeshInterraction(date.getTime())),
  );

  connection.onRoutingPacket.subscribe((routingPacket) => {
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
