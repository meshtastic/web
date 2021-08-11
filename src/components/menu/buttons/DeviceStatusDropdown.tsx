import React from 'react';

import { SwitchVerticalIcon } from '@heroicons/react/outline';

import { useAppSelector } from '../../../hooks/redux';
import { IconButton } from '../../generic/IconButton';

export const DeviceStatusDropdown = (): JSX.Element => {
  const ready = useAppSelector((state) => state.meshtastic.ready);
  const deviceStatus = useAppSelector((state) => state.meshtastic.deviceStatus);

  return (
    <IconButton>
      <SwitchVerticalIcon className={`h-6 w-6 ${!ready && 'animate-pulse'}`} />
      {/* <div
        className={`flex w-6 h-6 rounded-full animate-pulse shadow-md ${
          deviceStatus <= Types.DeviceStatusEnum.DEVICE_DISCONNECTED
            ? 'bg-red-400 animate-pulse'
            : deviceStatus <= Types.DeviceStatusEnum.DEVICE_CONFIGURING &&
              !ready
            ? 'bg-yellow-400 animate-pulse'
            : ready
            ? 'bg-green-400'
            : 'bg-gray-400'
        }`}
      ></div> */}
    </IconButton>
  );
};
