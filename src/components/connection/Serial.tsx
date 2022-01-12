import React from 'react';

import { useForm } from 'react-hook-form';
import { FiCheck } from 'react-icons/fi';

import { serial, setConnection } from '@core/connection';
import { connType, setConnectionParams } from '@core/slices/appSlice';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { Button, IconButton } from '@meshtastic/components';

export const Serial = (): JSX.Element => {
  const [serialDevices, setSerialDevices] = React.useState<SerialPort[]>([]);
  const dispatch = useAppDispatch();

  const { handleSubmit } = useForm<{
    device?: SerialPort;
  }>();

  const updateSerialDeviceList = React.useCallback(async (): Promise<void> => {
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
            className="flex justify-between p-2 bg-gray-700 rounded-md"
            key={index}
          >
            <div className="flex gap-4 my-auto">
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
              icon={<FiCheck />}
            />
          </div>
        ))
      ) : (
        <div className="h-40 border border-gray-300 rounded-md dark:border-gray-600">
          <p>No previously connected devices found</p>
        </div>
      )}
      <Button type="submit" className="mt-2 ml-auto" border>
        Connect
      </Button>
    </form>
  );
};
