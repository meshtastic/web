import type React from 'react';

import { FiWifi, FiWifiOff } from 'react-icons/fi';

import { useAppDispatch, useAppSelector } from '@app/hooks/redux';
import { Button } from '@components/generic/Button';
import { openConnectionModal } from '@core/slices/appSlice';
import { Types } from '@meshtastic/meshtasticjs';

export const DeviceStatus = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const deviceStatus = useAppSelector((state) => state.meshtastic.deviceStatus);
  const ready = useAppSelector((state) => state.meshtastic.ready);

  return (
    <Button
      padding={0}
      active
      onClick={(): void => {
        dispatch(dispatch(openConnectionModal()));
      }}
    >
      <div className="flex gap-2 px-2">
        <div
          className={`
        my-auto w-2 h-2 rounded-full min-w-[2] ${
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
        <div className="py-2">
          {ready ? (
            <FiWifi className="w-5 h-5" />
          ) : (
            <FiWifiOff className="w-5 h-5 animate-pulse" />
          )}
        </div>
      </div>
    </Button>
  );
};
