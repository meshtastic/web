import React from 'react';

import { FiWifi, FiWifiOff } from 'react-icons/fi';

import { useAppSelector } from '@app/hooks/redux';
import { Button } from '@components/generic/Button';
import { Types } from '@meshtastic/meshtasticjs';

export const DeviceStatusDropdown = (): JSX.Element => {
  const deviceStatus = useAppSelector((state) => state.meshtastic.deviceStatus);
  const ready = useAppSelector((state) => state.meshtastic.ready);

  return (
    <div className="flex bg-gray-100 rounded-full dark:bg-gray-700">
      <div className="flex pl-2 my-auto dark:text-white">
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
        <Button
          icon={
            ready ? (
              <FiWifi className="w-6 h-6" />
            ) : (
              <FiWifiOff className="w-6 h-6 animate-pulse" />
            )
          }
          circle
        />
      </div>
    </div>
  );
};
