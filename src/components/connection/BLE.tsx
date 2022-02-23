import type React from 'react';
import { useCallback, useEffect, useState } from 'react';

import { useForm } from 'react-hook-form';
import { FiArrowRightCircle } from 'react-icons/fi';

import { Button } from '@components/generic/button/Button';
import { IconButton } from '@components/generic/button/IconButton';
import { connection, setConnection } from '@core/connection';
import { connType } from '@core/slices/appSlice';
import { IBLEConnection } from '@meshtastic/meshtasticjs';

export interface BLEProps {
  connecting: boolean;
}

export const BLE = ({ connecting }: BLEProps): JSX.Element => {
  const [bleDevices, setBleDevices] = useState<BluetoothDevice[]>([]);

  const { handleSubmit } = useForm<{
    device?: BluetoothDevice;
  }>();

  const updateBleDeviceList = useCallback(async (): Promise<void> => {
    const ble = new IBLEConnection();
    const devices = await ble.getDevices();
    setBleDevices(devices);
  }, []);

  useEffect(() => {
    void updateBleDeviceList();
  }, [updateBleDeviceList]);

  const onSubmit = handleSubmit(async () => {
    await setConnection(connType.BLE);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      {bleDevices.map((device, index) => (
        <div
          onClick={async (): Promise<void> => {
            await setConnection(connType.BLE);
          }}
          className="flex justify-between rounded-md bg-gray-700 p-2 dark:text-white"
          key={index}
        >
          <div className="my-auto">{device.name}</div>
          <IconButton
            nested
            onClick={async (): Promise<void> => {
              await setConnection(connType.BLE);
            }}
            icon={<FiArrowRightCircle />}
            disabled={connecting}
          />
        </div>
      ))}
      <Button
        className="mt-2 ml-auto"
        onClick={async (): Promise<void> => {
          if (connecting) {
            await connection.disconnect();
          } else {
            await onSubmit();
          }
        }}
        border
      >
        {connecting ? 'Disconnect' : 'Connect'}
      </Button>
    </form>
  );
};
