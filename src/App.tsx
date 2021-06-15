import React from 'react';

import type {
  IBLEConnection,
  ISerialConnection,
} from '@meshtastic/meshtasticjs';
import {
  Client,
  IHTTPConnection,
  Protobuf,
  SettingsManager,
  Types,
} from '@meshtastic/meshtasticjs';

import Header from './components/Header';
import Main from './Main';
import { channelSubject$, nodeSubject$, preferencesSubject$ } from './streams';

const App = (): JSX.Element => {
  const [deviceStatus, setDeviceStatus] =
    React.useState<Types.DeviceStatusEnum>(
      Types.DeviceStatusEnum.DEVICE_DISCONNECTED,
    );
  const [myNodeInfo, setMyNodeInfo] = React.useState<Protobuf.MyNodeInfo>(
    Protobuf.MyNodeInfo.create(),
  );
  const [connection, setConnection] = React.useState<
    ISerialConnection | IHTTPConnection | IBLEConnection
  >(new IHTTPConnection());
  const [isReady, setIsReady] = React.useState<boolean>(false);
  const [lastMeshInterraction, setLastMeshInterraction] =
    React.useState<number>(0);
  const [darkmode, setDarkmode] = React.useState<boolean>(false);

  React.useEffect(() => {
    const client = new Client();
    const tmpConnection = client.createHTTPConnection();

    tmpConnection.connect({
      address:
        import.meta.env.NODE_ENV === 'production'
          ? window.location.hostname
          : import.meta.env.SNOWPACK_PUBLIC_DEVICE_IP,
      receiveBatchRequests: false,
      tls: false,
      fetchInterval: 2000,
    });
    setConnection(tmpConnection);
    SettingsManager.debugMode = Protobuf.LogRecord_Level.TRACE;
  }, []);

  React.useEffect(() => {
    const deviceStatusEvent = connection.onDeviceStatusEvent.subscribe(
      (status) => {
        setDeviceStatus(status);
        if (status === Types.DeviceStatusEnum.DEVICE_CONFIGURED) {
          setIsReady(true);
        }
      },
    );
    const myNodeInfoEvent =
      connection.onMyNodeInfoEvent.subscribe(setMyNodeInfo);

    const nodeInfoPacketEvent = connection.onNodeInfoPacketEvent.subscribe(
      (node) => nodeSubject$.next(node),
    );

    const adminPacketEvent = connection.onAdminPacketEvent.subscribe(
      (adminMessage) => {
        switch (adminMessage.data.variant.oneofKind) {
          case 'getChannelResponse':
            channelSubject$.next(adminMessage.data.variant.getChannelResponse);
            break;
          case 'getRadioResponse':
            if (adminMessage.data.variant.getRadioResponse.preferences) {
              preferencesSubject$.next(
                adminMessage.data.variant.getRadioResponse.preferences,
              );
            }
            break;
          default:
            break;
        }
      },
    );

    const meshHeartbeat = connection.onMeshHeartbeat.subscribe(
      setLastMeshInterraction,
    );

    return () => {
      deviceStatusEvent?.unsubscribe();
      myNodeInfoEvent?.unsubscribe();
      nodeInfoPacketEvent?.unsubscribe();
      adminPacketEvent?.unsubscribe();
      meshHeartbeat?.unsubscribe();
      connection.disconnect();
    };
  }, [connection]);

  return (
    <div className="flex flex-col h-screen w-screen">
      <Header
        status={deviceStatus}
        IsReady={isReady}
        LastMeshInterraction={lastMeshInterraction}
        connection={connection}
      />
      <Main
        isReady={isReady}
        myNodeInfo={myNodeInfo}
        connection={connection}
        darkmode={darkmode}
        setDarkmode={setDarkmode}
      />
    </div>
  );
};

export default App;
