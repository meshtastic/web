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
    <form onSubmit={onSubmit} className="flex flex-grow flex-col">
      <div className="flex flex-grow flex-col gap-2 overflow-y-auto rounded-md border border-gray-300 bg-gray-200 p-2 dark:border-gray-600 dark:bg-secondaryDark dark:text-gray-400">
        {bleDevices.length > 0 ? (
          bleDevices.map((device, index) => (
            <div
              className="flex justify-between rounded-md bg-white p-2 dark:bg-primaryDark dark:text-white"
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
          ))
        ) : (
          <div className="m-auto">
            <p>No previously connected devices found</p>
          </div>
        )}
      </div>
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
