import React from 'react';

import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FiCheck, FiMenu, FiSave } from 'react-icons/fi';

import { Card } from '@app/components/generic/Card';
import { EnumSelect } from '@app/components/generic/form/EnumSelect';
import { Input } from '@app/components/generic/form/Input';
import { IconButton } from '@app/components/generic/IconButton';
import { Toggle } from '@app/components/generic/Toggle';
import { connection, setConnection } from '@app/core/connection';
import { useAppDispatch, useAppSelector } from '@app/hooks/redux';
import { Button } from '@components/generic/Button';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import {
  IBLEConnection,
  IHTTPConnection,
  ISerialConnection,
} from '@meshtastic/meshtasticjs';
import type {
  BLEConnectionParameters,
  HTTPConnectionParameters,
  SerialConnectionParameters,
} from '@meshtastic/meshtasticjs/dist/types';

export interface ConnectionProps {
  navOpen: boolean;
  setNavOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

enum connType {
  HTTP,
  BLE,
  SERIAL,
}

export const Connection = ({
  navOpen,
  setNavOpen,
}: ConnectionProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const [selectedConnType, setSelectedConnType] = React.useState(connType.HTTP);
  const [bleDevices, setBleDevices] = React.useState<BluetoothDevice[]>([]);
  const [serialDevices, setSerialDevices] = React.useState<SerialPort[]>([]);
  const [httpIpSource, setHttpIpSource] = React.useState<'local' | 'remote'>(
    'local',
  );
  const { t } = useTranslation();
  const hostOverrideEnabled = useAppSelector(
    (state) => state.meshtastic.hostOverrideEnabled,
  );
  const hostOverride = useAppSelector((state) => state.meshtastic.hostOverride);

  const { register, handleSubmit, formState } = useForm<{
    method: connType;
  }>({
    defaultValues: {
      method: connType.HTTP,
    },
  });

  const connect = (
    connectionType: connType,
    params:
      | HTTPConnectionParameters
      | SerialConnectionParameters
      | BLEConnectionParameters,
  ): void => {
    connection.complete();
    connection.disconnect();

    if (connectionType === connType.BLE) {
      setConnection(new IBLEConnection());
    } else if (connectionType === connType.HTTP) {
      setConnection(new IHTTPConnection());
    } else {
      setConnection(new ISerialConnection());
    }

    // @ts-ignore tmp
    await connection.connect(params);
  };

  const updateBleDeviceList = async (): Promise<void> => {
    const devices = await ble.getDevices();
    setBleDevices(devices);
  };

  const updateSerialDeviceList = async (): Promise<void> => {
    const devices = await serial.getPorts();
    console.log(devices);

    setSerialDevices(devices);
  };

  React.useEffect(() => {
    if (selectedConnType === connType.BLE) {
      void updateBleDeviceList();
    }
    if (selectedConnType === connType.SERIAL) {
      void updateSerialDeviceList();
    }
  }, [selectedConnType]);

  const onSubmit = handleSubmit((data) => {
    // void connection.setOwner(data);
  });

  const connectionURL: string = hostOverrideEnabled
    ? hostOverride
    : import.meta.env.NODE_ENV === 'production'
    ? window.location.hostname
    : (import.meta.env.SNOWPACK_PUBLIC_DEVICE_IP as string) ??
      'http://meshtastic.local';

  const ble = new IBLEConnection();
  const serial = new ISerialConnection();

  return (
    <PrimaryTemplate
      title="Connection"
      tagline="Settings"
      button={
        <IconButton
          icon={<FiMenu className="w-5 h-5" />}
          onClick={(): void => {
            setNavOpen(!navOpen);
          }}
        />
      }
      footer={
        <Button
          className="px-10 ml-auto"
          icon={<FiSave className="w-5 h-5" />}
          disabled={!formState.isDirty}
          active
          border
        >
          {t('strings.save_changes')}
        </Button>
      }
    >
      <Card
        title="Basic settings"
        description="Device name and user parameters"
      >
        <div className="w-full max-w-3xl p-10 md:max-w-xl">
          <form className="space-y-2" onSubmit={onSubmit}>
            <EnumSelect
              label="Method"
              optionsEnum={connType}
              value={selectedConnType}
              onChange={(e): void => {
                setSelectedConnType(parseInt(e.target.value));
              }}
            />
            {selectedConnType === connType.HTTP && (
              <>
                <EnumSelect
                  label="Host Source"
                  options={[
                    {
                      name: 'Local',
                      value: 'local',
                    },
                    {
                      name: 'Remote',
                      value: 'remote',
                    },
                  ]}
                  value={httpIpSource}
                  onChange={(e): void => {
                    setHttpIpSource(e.target.value as 'local' | 'remote');
                  }}
                />
                {httpIpSource === 'local' ? (
                  <Input label="Host" value={connectionURL} disabled />
                ) : (
                  <Input label="Host" />
                )}
                <Toggle label="Use TLS?" />
              </>
            )}
            {selectedConnType === connType.BLE && (
              <div>
                <div className="flex space-x-2">
                  <Button border onClick={updateBleDeviceList}>
                    Refresh List
                  </Button>
                  <Button
                    border
                    onClick={async () => {
                      await ble.getDevice();
                    }}
                  >
                    New Device
                  </Button>
                </div>
                <div className="space-y-2">
                  <div>Previously connected devices</div>
                  {bleDevices.map((device) => (
                    <div
                      onClick={() => {
                        console.log('clicked');

                        connect(connType.BLE, {
                          device: device,
                        });
                      }}
                      className="flex justify-between p-2 bg-gray-700 rounded-md"
                      key={device.id}
                    >
                      <div className="my-auto">{device.name}</div>
                      <IconButton
                        onClick={() => {
                          console.log('clicked');

                          connect(connType.BLE, {
                            device: device,
                          });
                        }}
                        icon={<FiCheck />}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedConnType === connType.SERIAL && (
              <div>
                <div className="flex space-x-2">
                  <Button border onClick={updateBleDeviceList}>
                    Refresh List
                  </Button>
                  <Button
                    border
                    onClick={async () => {
                      await serial.getPort();
                    }}
                  >
                    New Device
                  </Button>
                </div>
                <div className="space-y-2">
                  <div>Previously connected devices</div>
                  {serialDevices.map((device) => (
                    <div
                      className="flex justify-between p-2 bg-gray-700 rounded-md"
                      key={device.getInfo().usbProductId}
                    >
                      <div className="my-auto">
                        {device.getInfo().usbProductId}
                        {device.getInfo().usbVendorId}
                      </div>
                      <IconButton
                        onClick={() => {
                          connect(connType.SERIAL, {
                            // @ts-ignore tmp
                            device: device,
                          });
                        }}
                        icon={<FiCheck />}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>
      </Card>
    </PrimaryTemplate>
  );
};
