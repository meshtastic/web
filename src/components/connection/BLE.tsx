import React from 'react';

import { FiCheck } from 'react-icons/fi';

import { connType } from '@app/core/slices/appSlice';
import { IconButton } from '@components/generic/IconButton';
import { ble, setConnection } from '@core/connection';

export const BLE = (): JSX.Element => {
  const [bleDevices, setBleDevices] = React.useState<BluetoothDevice[]>([]);

  const updateBleDeviceList = React.useCallback(async (): Promise<void> => {
    const devices = await ble.getDevices();
    setBleDevices(devices);
  }, []);

  React.useEffect(() => {
    void updateBleDeviceList();
  }, [updateBleDeviceList]);

  return (
    <div className="space-y-2">
      {bleDevices.map((device, index) => (
        <div
          onClick={async (): Promise<void> => {
            await setConnection(connType.BLE);
          }}
          className="flex justify-between p-2 bg-gray-700 rounded-md"
          key={index}
        >
          <div className="my-auto">{device.name}</div>
          <IconButton
            onClick={async (): Promise<void> => {
              await setConnection(connType.BLE);
            }}
            icon={<FiCheck />}
          />
        </div>
      ))}
    </div>
  );
};
