import React from 'react';

import { AnimatePresence } from 'framer-motion';

import { BLE } from '@components/connection/BLE';
import { HTTP } from '@components/connection/HTTP';
import { Serial } from '@components/connection/Serial';
import { Modal } from '@components/generic/Modal';
import { connection, connectionUrl, setConnection } from '@core/connection';
import {
  closeConnectionModal,
  connType,
  setConnectionParams,
  setConnType,
} from '@core/slices/appSlice';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { useAppSelector } from '@hooks/useAppSelector';
import { Button, Card, Select } from '@meshtastic/components';
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
          className="w-full max-w-3xl"
          onClose={(): void => {
            dispatch(closeConnectionModal());
          }}
        >
          <Card>
            <div className="w-full max-w-3xl p-10">
              {state.deviceStatus ===
              Types.DeviceStatusEnum.DEVICE_DISCONNECTED ? (
                <div className="space-y-2">
                  <Select
                    label="Connection Method"
                    optionsEnum={connType}
                    value={appState.connType}
                    onChange={(e): void => {
                      dispatch(setConnType(parseInt(e.target.value)));
                    }}
                  />
                  {appState.connType === connType.HTTP && <HTTP />}
                  {appState.connType === connType.BLE && <BLE />}
                  {appState.connType === connType.SERIAL && <Serial />}
                </div>
              ) : (
                <div>
                  <span>Connecting...</span>
                  {state.deviceStatus ===
                    Types.DeviceStatusEnum.DEVICE_CONNECTED && (
                    <Button
                      border
                      onClick={async (): Promise<void> => {
                        await connection.disconnect();
                      }}
                    >
                      Disconnect
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        </Modal>
      )}
    </AnimatePresence>
  );
};
