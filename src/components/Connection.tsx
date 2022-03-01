import type React from 'react';
import { useEffect } from 'react';

import { m } from 'framer-motion';

import { BLE } from '@components/connection/BLE';
import { HTTP } from '@components/connection/HTTP';
import { Serial } from '@components/connection/Serial';
import { Select } from '@components/generic/form/Select';
import { Modal } from '@components/generic/Modal';
import { connectionUrl, setConnection } from '@core/connection';
import {
  closeConnectionModal,
  connType,
  setConnectionParams,
  setConnType,
} from '@core/slices/appSlice';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { useAppSelector } from '@hooks/useAppSelector';
import { Types } from '@meshtastic/meshtasticjs';

export const Connection = (): JSX.Element => {
  const dispatch = useAppDispatch();

  const meshtasticState = useAppSelector((state) => state.meshtastic);
  const appState = useAppSelector((state) => state.app);

  useEffect(() => {
    if (!import.meta.env.VITE_PUBLIC_HOSTED) {
      dispatch(
        setConnectionParams({
          type: connType.HTTP,
          params: {
            address: connectionUrl,
            tls: false,
            receiveBatchRequests: false,
            fetchInterval: 2000,
          },
        }),
      );
      void setConnection(connType.HTTP);
    }
  }, [dispatch]);

  useEffect(() => {
    if (meshtasticState.ready) {
      dispatch(closeConnectionModal());
    }
  }, [meshtasticState.ready, dispatch]);

  return (
    <Modal
      title="Connect to a device"
      open={appState.connectionModalOpen}
      onClose={(): void => {
        dispatch(closeConnectionModal());
      }}
    >
      <div className="flex max-w-3xl flex-col gap-4 md:flex-row">
        <div className="flex flex-col md:w-1/2">
          <div className="flex flex-grow flex-col space-y-2">
            <Select
              label="Connection Method"
              optionsEnum={connType}
              value={appState.connType}
              onChange={(e): void => {
                dispatch(setConnType(parseInt(e.target.value)));
              }}
              disabled={
                meshtasticState.deviceStatus ===
                Types.DeviceStatusEnum.DEVICE_CONNECTED
              }
            />
            {appState.connType === connType.HTTP && (
              <HTTP
                connecting={
                  meshtasticState.deviceStatus ===
                  Types.DeviceStatusEnum.DEVICE_CONNECTED
                }
              />
            )}
            {appState.connType === connType.BLE && (
              <BLE
                connecting={
                  meshtasticState.deviceStatus ===
                  Types.DeviceStatusEnum.DEVICE_CONNECTED
                }
              />
            )}
            {appState.connType === connType.SERIAL && (
              <Serial
                connecting={
                  meshtasticState.deviceStatus ===
                  Types.DeviceStatusEnum.DEVICE_CONNECTED
                }
              />
            )}
          </div>
        </div>
        <div className="md:w-1/2">
          <div className="h-96 overflow-y-auto rounded-md border border-gray-400 bg-gray-200 p-2 drop-shadow-md dark:border-gray-600 dark:bg-tertiaryDark dark:text-gray-400">
            {meshtasticState.logs.length === 0 && (
              <div className="flex h-full w-full">
                <m.img
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="m-auto h-40 w-40 text-green-500"
                  src={`/placeholders/${
                    appState.darkMode ? 'View Code Dark.svg' : 'View Code.svg'
                  }`}
                />
              </div>
            )}
            {meshtasticState.logs
              .filter((log) => {
                return ![
                  Types.Emitter.handleFromRadio,
                  Types.Emitter.handleMeshPacket,
                  Types.Emitter.sendPacket,
                ].includes(log.emitter);
              })
              .map((log, index) => (
                <div key={index} className="flex">
                  <div className="truncate font-mono text-sm">
                    {log.message}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
