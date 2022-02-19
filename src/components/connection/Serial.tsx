import React from 'react';

import { useForm } from 'react-hook-form';
import { FiCheck } from 'react-icons/fi';

import { Button } from '@components/generic/button/Button';
import { IconButton } from '@components/generic/button/IconButton';
import { connection, setConnection } from '@core/connection';
import { connType, setConnectionParams } from '@core/slices/appSlice';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { ISerialConnection } from '@meshtastic/meshtasticjs';

export interface SerialProps {
  connecting: boolean;
}

export const Serial = ({ connecting }: SerialProps): JSX.Element => {
  const [serialDevices, setSerialDevices] = React.useState<SerialPort[]>([]);
  const dispatch = useAppDispatch();

  const { handleSubmit } = useForm<{
    device?: SerialPort;
  }>();

  const updateSerialDeviceList = React.useCallback(async (): Promise<void> => {
    const serial = new ISerialConnection();
    const devices = await serial.getPorts();
    setSerialDevices(devices);
  }, []);

  React.useEffect(() => {
    void updateSerialDeviceList();
  }, [updateSerialDeviceList]);

  const onSubmit = handleSubmit(async () => {
    await setConnection(connType.SERIAL);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      {serialDevices.length > 0 ? (
        serialDevices.map((device, index) => (
          <div
            className="flex justify-between rounded-md bg-secondaryDark p-2"
            key={index}
          >
            <div className="my-auto flex gap-4">
              <p>
                Vendor: <small>{device.getInfo().usbVendorId}</small>
              </p>
              <p>
                Device: <small>{device.getInfo().usbProductId}</small>
              </p>
            </div>
            <IconButton
              onClick={async (): Promise<void> => {
                dispatch(
                  setConnectionParams({
                    type: connType.SERIAL,
                    params: {
                      port: device,
                    },
                  }),
                );
                await setConnection(connType.SERIAL);
              }}
              disabled={connecting}
              icon={<FiCheck />}
            />
          </div>
        ))
      ) : (
        <div className="h-40 rounded-md border border-gray-300 dark:border-gray-600">
          <p>No previously connected devices found</p>
        </div>
      )}
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
