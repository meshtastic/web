import React from 'react';

import {
  ChipIcon,
  DeviceMobileIcon,
  RssIcon,
  StatusOfflineIcon,
  StatusOnlineIcon,
  WifiIcon,
} from '@heroicons/react/outline';
import {
  IBLEConnection,
  IHTTPConnection,
  ISerialConnection,
  Types,
} from '@meshtastic/meshtasticjs';

import Logo from './logo';

interface HeaderProps {
  status: Types.DeviceStatusEnum;
  IsReady: boolean;
  LastMeshInterraction: number;
  connection?: IHTTPConnection | ISerialConnection | IBLEConnection;
  setConnection: React.Dispatch<
    React.SetStateAction<
      IHTTPConnection | ISerialConnection | IBLEConnection | undefined
    >
  >;
}

const Header = (props: HeaderProps): JSX.Element => {
  const [activeConnection, setActiveConnection] =
    React.useState<'http' | 'serial' | 'ble'>('http');
  return (
    <nav className="w-full shadow-md">
      <div className="flex w-full container mx-auto justify-between px-6 py-4">
        <Logo />
        <div></div>

        <div className="flex space-x-2 items-center">
          <button
            className={`rounded-md px-3 py-2 ${
              activeConnection === 'serial' ? 'bg-green-300' : 'bg-gray-300'
            }`}
            onClick={() => {
              props.connection?.disconnect();
              const connection = new ISerialConnection();
              connection.connect({});
              setActiveConnection('serial');
              props.setConnection(connection);
            }}
          >
            <ChipIcon className="m-auto h-5 w-5" />
          </button>
          <button
            className={`rounded-md px-3 py-2 ${
              activeConnection === 'http' ? 'bg-green-300' : 'bg-gray-300'
            }`}
            onClick={() => {
              props.connection?.disconnect();
              const connection = new IHTTPConnection();
              connection.connect({
                address:
                  import.meta.env.NODE_ENV === 'production'
                    ? window.location.hostname
                    : import.meta.env.SNOWPACK_PUBLIC_DEVICE_IP,
                receiveBatchRequests: false,
                tls: false,
                fetchInterval: 2000,
              });
              setActiveConnection('http');
              props.setConnection(connection);
            }}
          >
            <WifiIcon className="m-auto h-5 w-5" />
          </button>
          <button
            className={`rounded-md px-3 py-2 ${
              activeConnection === 'ble' ? 'bg-green-300' : 'bg-gray-300'
            }`}
            onClick={() => {
              props.connection?.disconnect();
              const connection = new IBLEConnection();
              connection.connect({});
              setActiveConnection('ble');
              props.setConnection(connection);
            }}
          >
            <RssIcon className="m-auto h-5 w-5" />
          </button>
          <div className="flex pl-2">
            <div
              className={`w-5 h-5 rounded-full ${
                new Date(props.LastMeshInterraction) <
                new Date(Date.now() - 40000)
                  ? 'bg-red-400'
                  : new Date(props.LastMeshInterraction) <
                    new Date(Date.now() - 20000)
                  ? 'bg-yellow-400'
                  : 'bg-green-400'
              }`}
            ></div>
            {new Date(props.LastMeshInterraction) >
            new Date(Date.now() - 40000) ? (
              <StatusOnlineIcon className="m-auto ml-1 h-5 w-5" />
            ) : (
              <StatusOfflineIcon className="m-auto ml-1 h-5 w-5" />
            )}
          </div>

          <div className="flex pl-2">
            <div
              className={`w-5 h-5 rounded-full ${
                props.status <= Types.DeviceStatusEnum.DEVICE_DISCONNECTED
                  ? 'bg-red-400'
                  : props.status <= Types.DeviceStatusEnum.DEVICE_CONFIGURING &&
                    !props.IsReady
                  ? 'bg-yellow-400'
                  : props.IsReady
                  ? 'bg-green-400'
                  : 'bg-gray-400'
              }`}
            ></div>
            <DeviceMobileIcon className="m-auto ml-1 w-5 h-5" />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;
