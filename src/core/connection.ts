import {
  addChannel,
  addMessage,
  addNode,
  addPosition,
  addUser,
  setDeviceStatus,
  setLastMeshInterraction,
  setMyNodeInfo,
  setPreferences,
  setReady,
} from '@core/slices/meshtasticSlice';
import { store } from '@core/store';
import {
  IBLEConnection,
  IHTTPConnection,
  ISerialConnection,
  Protobuf,
  Types,
} from '@meshtastic/meshtasticjs';

type connectionType = IBLEConnection | IHTTPConnection | ISerialConnection;

export let connection: connectionType = new IHTTPConnection();

const state = store.getState().meshtastic;
export const connectionUrl = state.hostOverrideEnabled
  ? state.hostOverride
  : import.meta.env.PROD
  ? window.location.hostname
  : (import.meta.env.VITE_PUBLIC_DEVICE_IP as string) ??
    'http://meshtastic.local';

export const ble = new IBLEConnection();
export const serial = new ISerialConnection();

export const setConnection = (conn: connectionType): void => {
  cleanupListeners();
  connection = conn;

  registerListeners();
};

const cleanupListeners = (): void => {
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
  connection.onDeviceStatus.subscribe((status) => {
    store.dispatch(setDeviceStatus(status));

    if (status === Types.DeviceStatusEnum.DEVICE_CONFIGURED) {
      store.dispatch(setReady(true));
    }
    if (status === Types.DeviceStatusEnum.DEVICE_DISCONNECTED) {
      store.dispatch(setReady(false));
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
    },
  );

  connection.onAdminPacket.subscribe((adminPacket) => {
    switch (adminPacket.data.variant.oneofKind) {
      case 'getChannelResponse':
        store.dispatch(addChannel(adminPacket.data.variant.getChannelResponse));
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

  connection.onTextPacket.subscribe((message) => {
    const myNodeNum = store.getState().meshtastic.radio.hardware.myNodeNum;

    store.dispatch(
      addMessage({
        message: message,
        ack: message.packet.from !== myNodeNum,
        isSender: message.packet.from === myNodeNum,
        received: new Date(message.packet.rxTime),
      }),
    );
  });
};
