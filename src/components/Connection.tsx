import React from 'react';

import { AnimatePresence } from 'framer-motion';

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

  const state = useAppSelector((state) => state.meshtastic);
  const appState = useAppSelector((state) => state.app);

  React.useEffect(() => {
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

  React.useEffect(() => {
    if (state.ready) {
      dispatch(closeConnectionModal());
    }
  }, [state.ready, dispatch]);

  return (
    <AnimatePresence>
      {appState.connectionModalOpen && (
        <Modal
          title="Connect to a device"
          onClose={(): void => {
            dispatch(closeConnectionModal());
          }}
        >
          <div className="flex max-w-3xl flex-grow gap-4">
            <div className="w-1/2">
              <div className="space-y-2">
                <Select
                  label="Connection Method"
                  optionsEnum={connType}
                  value={appState.connType}
                  onChange={(e): void => {
                    dispatch(setConnType(parseInt(e.target.value)));
                  }}
                  disabled={
                    state.deviceStatus ===
                    Types.DeviceStatusEnum.DEVICE_CONNECTED
                  }
                />
                {appState.connType === connType.HTTP && (
                  <HTTP
                    connecting={
                      state.deviceStatus ===
                      Types.DeviceStatusEnum.DEVICE_CONNECTED
                    }
                  />
                )}
                {appState.connType === connType.BLE && (
                  <BLE
                    connecting={
                      state.deviceStatus ===
                      Types.DeviceStatusEnum.DEVICE_CONNECTED
                    }
                  />
                )}
                {appState.connType === connType.SERIAL && (
                  <Serial
                    connecting={
                      state.deviceStatus ===
                      Types.DeviceStatusEnum.DEVICE_CONNECTED
                    }
                  />
                )}
              </div>
            </div>
            <div className="w-1/2">
              <div className="h-96 overflow-y-auto rounded-md bg-gray-200 dark:bg-secondaryDark dark:text-gray-400">
                {state.logs
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
      )}
    </AnimatePresence>
  );
};
