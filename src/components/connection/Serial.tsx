import React from 'react';

import { FiCheck } from 'react-icons/fi';

import { useAppDispatch } from '@app/hooks/redux';
import { IconButton } from '@components/generic/IconButton';
import { serial, setConnection } from '@core/connection';
import { connType } from '@core/slices/appSlice';

export const Serial = (): JSX.Element => {
  const dispatch = useAppDispatch();

  const [serialDevices, setSerialDevices] = React.useState<SerialPort[]>([]);

  const updateSerialDeviceList = React.useCallback(async (): Promise<void> => {
    const devices = await serial.getPorts();
    setSerialDevices(devices);
  }, []);

  React.useEffect(() => {
    void updateSerialDeviceList();
  }, [updateSerialDeviceList]);

  return (
    <div className="space-y-2">
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
              await setConnection(connType.SERIAL);
            }}
            icon={<FiCheck />}
          />
        </div>
      ))}
    </div>
  );
};
