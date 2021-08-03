import React from 'react';

import {
  DeviceMobileIcon,
  StatusOfflineIcon,
  StatusOnlineIcon,
} from '@heroicons/react/outline';
import { Types } from '@meshtastic/meshtasticjs';

import { useAppSelector } from '../hooks/redux';
import { Logo } from './Logo';

export const Header = (): JSX.Element => {
  const deviceStatus = useAppSelector((state) => state.meshtastic.deviceStatus);
  const ready = useAppSelector((state) => state.meshtastic.ready);
  const lastMeshInterraction = useAppSelector(
    (state) => state.meshtastic.lastMeshInterraction,
  );

  return (
    <nav className="select-none w-full shadow-md">
      <div className="flex w-full container mx-auto justify-between px-6 py-4">
        <Logo />
        <div></div>

        <div className="flex space-x-2 items-center">
          <div className="flex">
            <div
              className={`w-5 h-5 rounded-full ${
                new Date(lastMeshInterraction) < new Date(Date.now() - 40000)
                  ? 'bg-red-400 animate-pulse'
                  : new Date(lastMeshInterraction) <
                    new Date(Date.now() - 20000)
                  ? 'bg-yellow-400 animate-pulse'
                  : 'bg-green-400'
              }`}
            ></div>
            {new Date(lastMeshInterraction) > new Date(Date.now() - 40000) ? (
              <StatusOnlineIcon className="m-auto ml-1 h-5 w-5" />
            ) : (
              <StatusOfflineIcon className="m-auto ml-1 h-5 w-5" />
            )}
          </div>

          <div className="flex">
            <div
              className={`w-5 h-5 rounded-full ${
                deviceStatus <= Types.DeviceStatusEnum.DEVICE_DISCONNECTED
                  ? 'bg-red-400 animate-pulse'
                  : deviceStatus <= Types.DeviceStatusEnum.DEVICE_CONFIGURING &&
                    !ready
                  ? 'bg-yellow-400 animate-pulse'
                  : ready
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
