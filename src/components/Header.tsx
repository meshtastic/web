import React from 'react';

import {
  DeviceMobileIcon,
  StatusOfflineIcon,
  StatusOnlineIcon,
} from '@heroicons/react/outline';
import type {
  IBLEConnection,
  IHTTPConnection,
  ISerialConnection,
} from '@meshtastic/meshtasticjs';
import { Types } from '@meshtastic/meshtasticjs';

import { Logo } from './Logo';

interface HeaderProps {
  status: Types.DeviceStatusEnum;
  IsReady: boolean;
  LastMeshInterraction: number;
  connection: IHTTPConnection | ISerialConnection | IBLEConnection;
}

export const Header = (props: HeaderProps): JSX.Element => {
  return (
    <nav className="select-none w-full shadow-md">
      <div className="flex w-full container mx-auto justify-between px-6 py-4">
        <Logo />
        <div></div>

        <div className="flex space-x-2 items-center">
          <div className="flex">
            <div
              className={`w-5 h-5 rounded-full ${
                new Date(props.LastMeshInterraction) <
                new Date(Date.now() - 40000)
                  ? 'bg-red-400 animate-pulse'
                  : new Date(props.LastMeshInterraction) <
                    new Date(Date.now() - 20000)
                  ? 'bg-yellow-400 animate-pulse'
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

          <div className="flex">
            <div
              className={`w-5 h-5 rounded-full ${
                props.status <= Types.DeviceStatusEnum.DEVICE_DISCONNECTED
                  ? 'bg-red-400 animate-pulse'
                  : props.status <= Types.DeviceStatusEnum.DEVICE_CONFIGURING &&
                    !props.IsReady
                  ? 'bg-yellow-400 animate-pulse'
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
