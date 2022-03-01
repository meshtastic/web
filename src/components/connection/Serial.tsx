import type React from 'react';
import { useCallback, useEffect, useState } from 'react';

import { useForm } from 'react-hook-form';
import { FiArrowRightCircle } from 'react-icons/fi';

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
  const [serialDevices, setSerialDevices] = useState<SerialPort[]>([]);
  const dispatch = useAppDispatch();

  const { handleSubmit } = useForm<{
    device?: SerialPort;
  }>();

  const updateSerialDeviceList = useCallback(async (): Promise<void> => {
    const serial = new ISerialConnection();
    const devices = await serial.getPorts();
    setSerialDevices(devices);
  }, []);

  useEffect(() => {
    void updateSerialDeviceList();
  }, [updateSerialDeviceList]);

  const onSubmit = handleSubmit(async () => {
    await setConnection(connType.SERIAL);
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-grow flex-col">
      <div className="flex flex-grow flex-col gap-2 overflow-y-auto rounded-md border border-gray-400 bg-gray-200 p-2 dark:border-gray-600 dark:bg-tertiaryDark dark:text-gray-400">
        {serialDevices.length > 0 ? (
          serialDevices.map((device, index) => (
            <div
              className="flex justify-between rounded-md bg-white p-2 dark:bg-primaryDark dark:text-white"
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
                icon={<FiArrowRightCircle />}
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
