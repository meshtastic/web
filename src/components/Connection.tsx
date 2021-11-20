import React from 'react';

import { FiCheck } from 'react-icons/fi';
import JSONPretty from 'react-json-pretty';

import { useAppDispatch, useAppSelector } from '@app/hooks/redux';
import { Button } from '@components/generic/Button';
import { Card } from '@components/generic/Card';
import { Checkbox } from '@components/generic/form/Checkbox';
import { Input } from '@components/generic/form/Input';
import { Select } from '@components/generic/form/Select';
import { IconButton } from '@components/generic/IconButton';
import { Modal } from '@components/generic/Modal';
import {
  ble,
  connection,
  connectionUrl,
  serial,
  setConnection,
} from '@core/connection';
import { closeConnectionModal } from '@core/slices/appSlice';
import {
  IBLEConnection,
  IHTTPConnection,
  ISerialConnection,
  Protobuf,
  SettingsManager,
} from '@meshtastic/meshtasticjs';
import type {
  BLEConnectionParameters,
  HTTPConnectionParameters,
  SerialConnectionParameters,
} from '@meshtastic/meshtasticjs/dist/types';

import { DeviceStatus } from './menu/buttons/DeviceStatus';

enum connType {
  HTTP,
  BLE,
  SERIAL,
}

export const Connection = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const [selectedConnType, setSelectedConnType] = React.useState(connType.HTTP);
  const [bleDevices, setBleDevices] = React.useState<BluetoothDevice[]>([]);
  const [serialDevices, setSerialDevices] = React.useState<SerialPort[]>([]);
  const [httpIpSource, setHttpIpSource] = React.useState<'local' | 'remote'>(
    'local',
  );
  const hostOverrideEnabled = useAppSelector(
    (state) => state.meshtastic.hostOverrideEnabled,
  );
  const hostOverride = useAppSelector((state) => state.meshtastic.hostOverride);
  const connectionModalOpen = useAppSelector(
    (state) => state.app.connectionModalOpen,
  );
  const ready = useAppSelector((state) => state.meshtastic.ready);
  const connect = async (
    connectionType: connType,
    params:
      | HTTPConnectionParameters
      | SerialConnectionParameters
      | BLEConnectionParameters,
  ): Promise<void> => {
    connection.complete();
    await connection.disconnect();

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

  const updateBleDeviceList = React.useCallback(async (): Promise<void> => {
    const devices = await ble.getDevices();
    setBleDevices(devices);
  }, []);

  const updateSerialDeviceList = React.useCallback(async (): Promise<void> => {
    const devices = await serial.getPorts();
    setSerialDevices(devices);
  }, []);

  React.useEffect(() => {
    if (ready) {
      dispatch(closeConnectionModal());
    }
  }, [ready, dispatch]);

  React.useEffect(() => {
    if (selectedConnType === connType.BLE) {
      void updateBleDeviceList();
    }
    if (selectedConnType === connType.SERIAL) {
      void updateSerialDeviceList();
    }
  }, [selectedConnType, updateBleDeviceList, updateSerialDeviceList]);

  React.useEffect(() => {
    const connectionMethod = localStorage.getItem('connectionMethod');

    switch (connectionMethod) {
      case 'serial':
        setConnection(new ISerialConnection());
        //show connection dialogue
        break;
      case 'bluetooth':
        setConnection(new IBLEConnection());
        //show connection dialogue
        break;
      default:
        setConnection(new IHTTPConnection());
        void connection.connect({
          address: connectionUrl,
          tls: false,
          receiveBatchRequests: false,
          fetchInterval: 2000,
        });
        break;
    }
    SettingsManager.debugMode = Protobuf.LogRecord_Level.TRACE;
  }, [hostOverrideEnabled, hostOverride]);

  return (
    <Modal
      open={connectionModalOpen}
      onClose={(): void => {
        dispatch(closeConnectionModal());
      }}
    >
      <Card>
        <div className="w-full max-w-3xl p-10 md:max-w-xl">
          {ready ? (
            <form className="space-y-2">
              <Select
                label="Method"
                optionsEnum={connType}
                value={selectedConnType}
                onChange={(e): void => {
                  setSelectedConnType(parseInt(e.target.value));
                }}
              />
              {selectedConnType === connType.HTTP && (
                <>
                  <Select
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
                    <Input label="Host" value={connectionUrl} disabled />
                  ) : (
                    <Input label="Host" />
                  )}
                  <Checkbox label="Use TLS?" />
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
                      onClick={async (): Promise<void> => {
                        await ble.getDevice();
                      }}
                    >
                      New Device
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div>Previously connected devices</div>
                    {bleDevices.map((device, index) => (
                      <div
                        onClick={async (): Promise<void> => {
                          await connect(connType.BLE, {
                            device: device,
                          });
                        }}
                        className="flex justify-between p-2 bg-gray-700 rounded-md"
                        key={index}
                      >
                        <div className="my-auto">{device.name}</div>
                        <IconButton
                          onClick={async (): Promise<void> => {
                            await connect(connType.BLE, {
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
                    <Button border onClick={updateSerialDeviceList}>
                      Refresh List
                    </Button>
                    <Button
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
                            await connect(connType.SERIAL, {
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
              )}
            </form>
          ) : (
            <div>
              <DeviceStatus />
            </div>
          )}
        </div>
      </Card>
    </Modal>
  );
};
