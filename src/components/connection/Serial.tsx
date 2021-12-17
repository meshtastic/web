import React from 'react';

import { useForm } from 'react-hook-form';
import { FiCheck } from 'react-icons/fi';

import { useAppDispatch } from '@app/hooks/redux';
import { Button } from '@components/generic/Button';
import { IconButton } from '@components/generic/IconButton';
import { serial, setConnection } from '@core/connection';
import { connType, setConnectionParams } from '@core/slices/appSlice';

export const Serial = (): JSX.Element => {
  const [serialDevices, setSerialDevices] = React.useState<SerialPort[]>([]);
  const dispatch = useAppDispatch();

  const { register, handleSubmit, control } = useForm<{
    device?: SerialPort;
  }>();

  const updateSerialDeviceList = React.useCallback(async (): Promise<void> => {
    const devices = await serial.getPorts();
    setSerialDevices(devices);
  }, []);

  React.useEffect(() => {
    void updateSerialDeviceList();
  }, [updateSerialDeviceList]);

  const onSubmit = handleSubmit(async (data) => {
    await setConnection(connType.SERIAL);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      {serialDevices.map((device, index) => (
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
      ))}
      <Button type="submit" className="mt-2 ml-auto" border>
        Connect
      </Button>
    </form>
  );
};
