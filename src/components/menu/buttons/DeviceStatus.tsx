import type React from 'react';

import { FiBluetooth, FiCpu, FiWifi } from 'react-icons/fi';

import { connType, openConnectionModal } from '@core/slices/appSlice';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { useAppSelector } from '@hooks/useAppSelector';
import { Button } from '@meshtastic/components';
import { Types } from '@meshtastic/meshtasticjs';

export const DeviceStatus = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const appState = useAppSelector((state) => state.app);
  const state = useAppSelector((state) => state.meshtastic);

  return (
    <Button
      active
      onClick={(): void => {
        dispatch(dispatch(openConnectionModal()));
      }}
    >
      <div className="flex gap-2 px-2">
        <div
          className={`
        my-auto h-2 w-2 min-w-[2] rounded-full ${
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
        {appState.connType === connType.BLE ? (
          <FiBluetooth className="h-5 w-5" />
        ) : appState.connType === connType.SERIAL ? (
          <FiCpu className="h-5 w-5" />
        ) : (
          <FiWifi className="h-5 w-5" />
        )}
      </div>
    </Button>
  );
};
