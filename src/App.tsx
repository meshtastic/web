import React from 'react';

import { Protobuf, SettingsManager, Types } from '@meshtastic/meshtasticjs';

import { Header } from './components/Header';
import { connection } from './connection';
import { useAppDispatch } from './hooks/redux';
import { Main } from './Main';
import {
  addChannel,
  addNode,
  setDeviceStatus,
  setLastMeshInterraction,
  setMyNodeInfo,
  setPreferences,
  setReady,
} from './slices/meshtasticSlice';

const App = (): JSX.Element => {
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    SettingsManager.debugMode = Protobuf.LogRecord_Level.TRACE;

    connection.connect({
      address:
        import.meta.env.NODE_ENV === 'production'
          ? window.location.hostname
          : import.meta.env.SNOWPACK_PUBLIC_DEVICE_IP,
      receiveBatchRequests: false,
      tls: false,
      fetchInterval: 2000,
    });
  }, []);

  React.useEffect(() => {
    connection.onDeviceStatus.subscribe((status) => {
      dispatch(setDeviceStatus(status));

      if (status === Types.DeviceStatusEnum.DEVICE_CONFIGURED) {
        dispatch(setReady(true));
      }
    });

    connection.onMyNodeInfo.subscribe((nodeInfo) => {
      dispatch(setMyNodeInfo(nodeInfo));
    });

    connection.onNodeInfoPacket.subscribe((nodeInfoPacket) =>
      dispatch(addNode(nodeInfoPacket.data)),
    );

    connection.onAdminPacket.subscribe((adminPacket) => {
      switch (adminPacket.data.variant.oneofKind) {
        case 'getChannelResponse':
          dispatch(addChannel(adminPacket.data.variant.getChannelResponse));
          break;
        case 'getRadioResponse':
          if (adminPacket.data.variant.getRadioResponse.preferences) {
            dispatch(
              setPreferences(
                adminPacket.data.variant.getRadioResponse.preferences,
              ),
            );
          }
          break;
      }
    });

    connection.onMeshHeartbeat.subscribe((date) =>
      dispatch(setLastMeshInterraction(date.getTime())),
    );
  }, [dispatch]);

  return (
    <div className="flex flex-col h-screen w-screen">
      <Header />
      <Main />
    </div>
  );
};

export default App;
