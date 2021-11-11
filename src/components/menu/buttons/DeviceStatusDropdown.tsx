import type React from 'react';

import { FiWifi, FiWifiOff } from 'react-icons/fi';

import { useAppSelector } from '@app/hooks/redux';
import { IconButton } from '@components/generic/IconButton';
import { Types } from '@meshtastic/meshtasticjs';

export const DeviceStatusDropdown = (): JSX.Element => {
  const deviceStatus = useAppSelector((state) => state.meshtastic.deviceStatus);
  const ready = useAppSelector((state) => state.meshtastic.ready);

  return (
    <div className="flex bg-gray-100 rounded-md dark:bg-gray-700">
      <div className="flex pl-2 my-auto space-x-2 dark:text-white">
        <div
          className={`
        my-auto mx-2 w-2 h-2 rounded-full min-w-[2] ${
          [
            Types.DeviceStatusEnum.DEVICE_CONNECTED,
            Types.DeviceStatusEnum.DEVICE_CONFIGURED,
          ].includes(deviceStatus)
            ? 'bg-green-400'
            : [
                Types.DeviceStatusEnum.DEVICE_CONNECTING,
                Types.DeviceStatusEnum.DEVICE_RECONNECTING,
                Types.DeviceStatusEnum.DEVICE_CONFIGURING,
              ].includes(deviceStatus)
            ? 'bg-yellow-400'
            : 'bg-gray-400'
        }`}
        ></div>
        <div className="my-auto">{Types.DeviceStatusEnum[deviceStatus]}</div>
        <IconButton
          icon={
            ready ? (
              <FiWifi className="w-5 h-5" />
            ) : (
              <FiWifiOff className="w-5 h-5 animate-pulse" />
            )
          }
        />
      </div>
    </div>
  );
};
