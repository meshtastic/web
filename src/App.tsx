import React from 'react';

import { useAppDispatch, useAppSelector } from '@app/hooks/redux';
import { DeviceStatusDropdown } from '@components/menu/buttons/DeviceStatusDropdown';
import { MobileNavToggle } from '@components/menu/buttons/MobileNavToggle';
import { ThemeToggle } from '@components/menu/buttons/ThemeToggle';
import { Logo } from '@components/menu/Logo';
import { MobileNav } from '@components/menu/MobileNav';
import { Navigation } from '@components/menu/Navigation';
import { connection, setConnection } from '@core/connection';
import { useRoute } from '@core/router';
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
import {
  IHTTPConnection,
  Protobuf,
  SettingsManager,
  Types,
} from '@meshtastic/meshtasticjs';
import { About } from '@pages/About';
import { Messages } from '@pages/Messages';
import { Nodes } from '@pages/Nodes/Index';
import { Settings } from '@pages/settings/Index';

import { NotFound } from './pages/NotFound';
import { Plugins } from './pages/Plugins/Index';

const App = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const route = useRoute();

  const myNodeInfo = useAppSelector((state) => state.meshtastic.myNodeInfo);
  const darkMode = useAppSelector((state) => state.app.darkMode);
  const hostOverrideEnabled = useAppSelector(
    (state) => state.meshtastic.hostOverrideEnabled,
  );

  const hostOverride = useAppSelector((state) => state.meshtastic.hostOverride);

  const connectionURL = hostOverrideEnabled
    ? hostOverride
    : import.meta.env.PROD
    ? window.location.hostname
    : (import.meta.env.VITE_PUBLIC_DEVICE_IP as string) ??
      'http://meshtastic.local';

  React.useEffect(() => {
    SettingsManager.debugMode = Protobuf.LogRecord_Level.TRACE;

    setConnection(new IHTTPConnection());
    void connection.connect({
      address: connectionURL,
      tls: false,
      receiveBatchRequests: false,
      fetchInterval: 2000,
    });
  }, [hostOverrideEnabled, hostOverride, connectionURL]);

  React.useEffect(() => {
    connection.onDeviceStatus.subscribe((status) => {
      dispatch(setDeviceStatus(status));

      if (status === Types.DeviceStatusEnum.DEVICE_CONFIGURED) {
        dispatch(setReady(true));
      }
      if (status === Types.DeviceStatusEnum.DEVICE_DISCONNECTED) {
        dispatch(setReady(false));
      }
    });

    connection.onMyNodeInfo.subscribe((nodeInfo) => {
      dispatch(setMyNodeInfo(nodeInfo));
    });

    connection.onUserPacket.subscribe((user) => {
      dispatch(addUser(user));
    });

    connection.onPositionPacket.subscribe((position) => {
      dispatch(addPosition(position));
    });

    connection.onNodeInfoPacket.subscribe(
      (nodeInfoPacket): void | { payload: Protobuf.NodeInfo; type: string } => {
        dispatch(addNode(nodeInfoPacket.data));
      },
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

    connection.onMeshHeartbeat.subscribe(
      (date): void | { payload: number; type: string } =>
        dispatch(setLastMeshInterraction(date.getTime())),
    );

    connection.onTextPacket.subscribe((message) => {
      dispatch(
        addMessage({
          message: message,
          ack: message.packet.from !== myNodeInfo.myNodeNum,
          isSender: message.packet.from === myNodeInfo.myNodeNum,
          received: new Date(message.packet.rxTime),
        }),
      );
    });

    return (): void => {
      connection.onDeviceStatus.cancelAll();
      connection.onMyNodeInfo.cancelAll();
      connection.onNodeInfoPacket.cancelAll();
      connection.onAdminPacket.cancelAll();
      connection.onMeshHeartbeat.cancelAll();
      connection.onTextPacket.cancelAll();
      connection.onRoutingPacket.cancelAll();
    };
  }, [dispatch, myNodeInfo.myNodeNum]);

  return (
    <div
      className={`h-screen w-screen ${darkMode ? 'dark rs-theme-dark' : ''}`}
    >
      <div className="flex flex-col h-full bg-gray-200 dark:bg-primaryDark">
        <div className="flex flex-shrink-0 overflow-hidden bg-primary dark:bg-primary">
          <div className="w-full overflow-hidden bg-white border-b border-gray-300 md:mt-6 md:mx-6 md:pt-4 md:pb-3 md:rounded-t-3xl dark:border-gray-600 md:shadow-md dark:bg-primaryDark">
            <div className="flex items-center justify-between h-16 px-4 md:px-6">
              <div className="hidden md:flex">
                <Logo />
              </div>
              <Navigation className="hidden md:flex" />
              <MobileNavToggle />
              <div className="flex items-center space-x-2">
                <DeviceStatusDropdown />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
        <MobileNav />

        <div className="flex flex-grow w-full min-h-0 md:px-6 md:mb-6">
          <div className="flex w-full bg-gray-100 md:shadow-xl md:overflow-hidden dark:bg-secondaryDark md:rounded-b-3xl">
            {route.name === 'messages' && <Messages />}
            {route.name === 'nodes' && <Nodes />}
            {route.name === 'plugins' && <Plugins />}
            {route.name === 'settings' && <Settings />}
            {route.name === 'about' && <About />}
            {route.name === false && <NotFound />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
