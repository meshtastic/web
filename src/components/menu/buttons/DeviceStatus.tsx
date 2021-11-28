import type React from 'react';

import { FiBluetooth, FiCpu, FiWifi } from 'react-icons/fi';

import { useAppDispatch, useAppSelector } from '@app/hooks/redux';
import { Button } from '@components/generic/Button';
import { connType, openConnectionModal } from '@core/slices/appSlice';
import { Types } from '@meshtastic/meshtasticjs';

export const DeviceStatus = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const appState = useAppSelector((state) => state.app);
  const state = useAppSelector((state) => state.meshtastic);

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
          ].includes(state.deviceStatus)
            ? 'bg-green-400'
            : [
                Types.DeviceStatusEnum.DEVICE_CONNECTING,
                Types.DeviceStatusEnum.DEVICE_RECONNECTING,
                Types.DeviceStatusEnum.DEVICE_CONFIGURING,
              ].includes(state.deviceStatus)
            ? 'bg-yellow-400'
            : 'bg-gray-400'
        }`}
        ></div>
        <div className="my-auto">
          {state.nodes.find(
            (node) => node.number === state.radio.hardware.myNodeNum,
          )?.user?.longName ?? 'Disconnected'}
        </div>
        <div className="py-2">
          {appState.connType === connType.BLE ? (
            <FiBluetooth className="w-5 h-5" />
          ) : appState.connType === connType.SERIAL ? (
            <FiCpu className="w-5 h-5" />
          ) : (
            <FiWifi className="w-5 h-5" />
          )}
        </div>
      </div>
    </Button>
  );
};
