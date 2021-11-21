import React from 'react';

import { FiCheck } from 'react-icons/fi';
import JSONPretty from 'react-json-pretty';

import { Button } from '@components/generic/Button';
import { IconButton } from '@components/generic/IconButton';
import { serial, setConnection } from '@core/connection';
import { connType } from '@core/slices/appSlice';

export const Serial = (): JSX.Element => {
  const [serialDevices, setSerialDevices] = React.useState<SerialPort[]>([]);

  const updateSerialDeviceList = React.useCallback(async (): Promise<void> => {
    const devices = await serial.getPorts();
    setSerialDevices(devices);
  }, []);

  React.useEffect(() => {
    void updateSerialDeviceList();
  }, [updateSerialDeviceList]);

  return (
    <div>
      <div className="flex space-x-2">
        <Button type="button" border onClick={updateSerialDeviceList}>
          Refresh List
        </Button>
        <Button
          type="button"
          border
          onClick={async (): Promise<void> => {
            console.log(await serial.getPort());
          }}
        >
          New Device
        </Button>
      </div>
      <div className="space-y-2">
        <div>Previously connected devices</div>
        {serialDevices.map((device, index) => (
          <div
            className="flex justify-between p-2 bg-gray-700 rounded-md"
            key={index}
          >
            <div className="my-auto">
              {device.getInfo().usbProductId}
              {device.getInfo().usbVendorId}
            </div>
            <IconButton
              onClick={async (): Promise<void> => {
                await setConnection(connType.SERIAL, {
                  // @ts-ignore tmp
                  device: device,
                });
              }}
              icon={<FiCheck />}
            />
            <JSONPretty data={device.getInfo()} />
          </div>
        ))}
      </div>
    </div>
  );
};
