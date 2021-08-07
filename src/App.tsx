import React from 'react';

import { Protobuf, SettingsManager, Types } from '@meshtastic/meshtasticjs';

import { DeviceStatusDropdown } from './components/menu/buttons/DeviceStatusDropdown';
import { LanguageDropdown } from './components/menu/buttons/LanguageDropdown';
import { MobileNavToggle } from './components/menu/buttons/MobileNavToggle';
import { ThemeToggle } from './components/menu/buttons/ThemeToggle';
import { Logo } from './components/menu/Logo';
import { MobileNav } from './components/menu/MobileNav';
import { Navigation } from './components/menu/Navigation';
import { connection } from './connection';
import { useAppDispatch, useAppSelector } from './hooks/redux';
import { About } from './pages/About';
import { Messages } from './pages/Messages';
import { Nodes } from './pages/Nodes';
import { Settings } from './pages/Settings';
import { useRoute } from './router';
import {
  ackMessage,
  addChannel,
  addMessage,
  addNode,
  setDeviceStatus,
  setLastMeshInterraction,
  setMyNodeInfo,
  setPreferences,
  setReady,
} from './slices/meshtasticSlice';

const App = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const route = useRoute();

  const myNodeInfo = useAppSelector((state) => state.meshtastic.myNodeInfo);
  const darkMode = useAppSelector((state) => state.app.darkMode);
  const hostOverrideEnabled = useAppSelector(
    (state) => state.meshtastic.hostOverrideEnabled,
  );
  const hostOverride = useAppSelector((state) => state.meshtastic.hostOverride);

  React.useEffect(() => {
    SettingsManager.debugMode = Protobuf.LogRecord_Level.TRACE;

    connection.connect({
      address: hostOverrideEnabled
        ? hostOverride
        : import.meta.env.NODE_ENV === 'production'
        ? window.location.hostname
        : import.meta.env.SNOWPACK_PUBLIC_DEVICE_IP,
      receiveBatchRequests: false,
      tls: false,
      fetchInterval: 2000,
    });
  }, [hostOverrideEnabled, hostOverride]);

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

    connection.onRoutingPacket.subscribe((routingPacket) => {
      if (routingPacket.packet.payloadVariant.oneofKind === 'decoded') {
        dispatch(
          ackMessage(routingPacket.packet.payloadVariant.decoded.requestId),
        );
      }
    });

    return () => {
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
    <div className={`h-screen w-screen  ${darkMode ? 'dark' : ''}`}>
      <div className="flex flex-col h-full w-full bg-gray-200 dark:bg-primaryDark">
        <div className="flex flex-shrink-0 w-full overflow-hidden bg-primary dark:bg-primary">
          <div className="w-full sm:py-3 sm:m-8 sm:mb-0 md:mt-12 md:mx-8 md:pt-4 md:pb-3 sm:rounded-t-xl border-b dark:border-gray-600 sm:shadow-md overflow-hidden bg-white dark:bg-primaryDark">
            <div className="flex items-center justify-between h-16 px-4 md:px-6">
              <div className="hidden md:flex">
                <Logo />
              </div>

              <MobileNavToggle />
              <div className="flex items-center space-x-2">
                <DeviceStatusDropdown />
                <LanguageDropdown />
                <ThemeToggle />
              </div>
            </div>
            <Navigation />
          </div>
        </div>

        <MobileNav />

        <div className="flex flex-grow min-h-0 w-full sm:px-8 sm:mb-8">
          <div className="flex w-full sm:shadow-xl sm:overflow-hidden bg-gray-100  dark:bg-secondaryDark sm:rounded-b-xl">
            {route.name === 'messages' && <Messages />}
            {route.name === 'nodes' && <Nodes />}
            {route.name === 'settings' && <Settings />}
            {route.name === 'about' && <About />}
            {route.name === false && 'Not Found'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
