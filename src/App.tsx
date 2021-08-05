import React from 'react';

import { HomeIcon, MenuIcon, MoonIcon } from '@heroicons/react/outline';
import { Protobuf, SettingsManager, Types } from '@meshtastic/meshtasticjs';

import { NavItem } from './components/nav/NavItem';
import { connection } from './connection';
import { useAppDispatch } from './hooks/redux';
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
    // <div className="flex flex-col h-screen w-screen">
    //   <Header />
    //   <Main />
    // </div>
    <div className="h-screen flex flex-col flex-auto items-center w-full min-w-0 bg-gray-200 ">
      <div className="relative flex justify-center w-full overflow-hidden z-50 bg-primary">
        <div className="max-w-360 w-full sm:py-3 sm:m-8 sm:mb-0 md:mt-12 md:mx-8 md:pt-4 md:pb-3 sm:rounded-t-xl border-b sm:shadow-2xl overflow-hidden bg-white">
          <div className="relative flex flex-auto flex-0 items-center h-16 px-4 md:px-6">
            {/* NORMAL NAV ICON */}
            <div className="hidden md:flex items-center mx-2">
              <img
                className="w-16 dark:hidden"
                src="Mesh_Logo_Black.svg"
                alt="Logo image"
              />
              <img
                className="hidden dark:flexw-16"
                src="Mesh_Logo_White.svg"
                alt="Logo image"
              />
            </div>
            {/* END NORMAL NAV ICON */}
            {/* MOBILE NAV BUTTON */}
            <button className="md:hidden w-10 h-10 rounded-full hover:bg-gray-200 hover:shadow-inner text-gray-500">
              <span className="flex justify-center ">
                <MenuIcon className="h-6 w-6" />
              </span>
            </button>
            {/* END MOBILE NAV BUTTON */}
            <div className="flex items-center pl-2 ml-auto space-x-1 sm:space-x-2">
              {/* HEADER BUTTON */}
              <button className="w-10 h-10 rounded-full hover:bg-gray-200 hover:shadow-inner">
                <span className="flex justify-center ">
                  <span className="w-6 shadow rounded-sm">
                    <img
                      className="w-full"
                      src="assets/images/flags/US.svg"
                      alt="Flag image for en"
                    />
                  </span>
                </span>
              </button>
              {/* END HEADER BUTTON */}
              {/* THEME BUTTON */}
              <button className="w-10 h-10 rounded-full hover:bg-gray-200 hover:shadow-inner text-gray-500">
                <span className="flex justify-center ">
                  <MoonIcon className="h-6 w-6" />
                </span>
              </button>
              {/* END THEME BUTTON */}
            </div>
          </div>
          <div className="hidden md:flex flex-auto flex-0 relative items-center h-16 px-4 ">
            <div className="flex items-center">
              {/* NAV ITEM */}
              <NavItem
                icon={<HomeIcon className="h-6 w-6 mr-3 text-gray-500" />}
                text={'Dashboard'}
              />
              {/* END NAV ITEM */}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-auto justify-center w-full sm:px-8 sm:mb-8">
        <div className="flex flex-col flex-auto w-full sm:max-w-360 sm:shadow-xl sm:overflow-hidden bg-gray-100 sm:rounded-b-xl">
          <div className="flex flex-col flex-auto min-w-0 ">content</div>
        </div>
      </div>
    </div>
  );
};

export default App;
