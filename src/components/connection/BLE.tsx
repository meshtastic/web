import React from 'react';

import { useForm } from 'react-hook-form';
import { FiCheck } from 'react-icons/fi';

import { connType } from '@app/core/slices/appSlice';
import { setConnection } from '@core/connection';
import { Button, IconButton } from '@meshtastic/components';
import { IBLEConnection } from '@meshtastic/meshtasticjs';

export const BLE = (): JSX.Element => {
  const [bleDevices, setBleDevices] = React.useState<BluetoothDevice[]>([]);

  const { handleSubmit } = useForm<{
    device?: BluetoothDevice;
  }>();

  const updateBleDeviceList = React.useCallback(async (): Promise<void> => {
    const ble = new IBLEConnection();
    const devices = await ble.getDevices();
    setBleDevices(devices);
  }, []);

  React.useEffect(() => {
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
          className="flex justify-between rounded-md bg-gray-700 p-2"
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
      <Button type="submit" className="mt-2 ml-auto" border>
        Connect
      </Button>
    </form>
  );
};
