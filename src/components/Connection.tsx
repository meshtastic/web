import React from 'react';

import { useAppDispatch, useAppSelector } from '@app/hooks/redux';
import { Serial } from '@components/connection/Serial';
import { Button } from '@components/generic/Button';
import { Card } from '@components/generic/Card';
import { Select } from '@components/generic/form/Select';
import { Modal } from '@components/generic/Modal';
import { DeviceStatus } from '@components/menu/buttons/DeviceStatus';
import {
  cleanupListeners,
  connection,
  connectionUrl,
  setConnection,
} from '@core/connection';
import {
  closeConnectionModal,
  connType,
  setConnectionParams,
  setConnType,
} from '@core/slices/appSlice';
import { resetState } from '@core/slices/meshtasticSlice';
import { Types } from '@meshtastic/meshtasticjs';

import { BLE } from './connection/BLE';
import { HTTP } from './connection/HTTP';

export const Connection = (): JSX.Element => {
  const dispatch = useAppDispatch();

  const state = useAppSelector((state) => state.meshtastic);
  const appState = useAppSelector((state) => state.app);

  React.useEffect(() => {
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
  }, [dispatch]);

  React.useEffect(() => {
    if (state.ready) {
      dispatch(closeConnectionModal());
    }
  }, [state.ready, dispatch]);

  return (
    <Modal
      className="w-full max-w-3xl"
      open={appState.connectionModalOpen}
      // open={true}
      onClose={(): void => {
        dispatch(closeConnectionModal());
      }}
    >
      <Card>
        <div className="w-full max-w-3xl p-10">
          <div className="flex justify-between w-full border rounded-md">
            <div className="p-2">
              <DeviceStatus />
            </div>
            <div className="p-2 my-auto">
              {state.deviceStatus ===
              Types.DeviceStatusEnum.DEVICE_DISCONNECTED ? (
                <Button
                  padding={2}
                  border
                  onClick={async (): Promise<void> => {
                    await setConnection(appState.connType);
                  }}
                >
                  Connect
                </Button>
              ) : (
                <Button
                  padding={2}
                  border
                  onClick={async (): Promise<void> => {
                    dispatch(resetState());
                    await connection.disconnect();
                    cleanupListeners();
                  }}
                >
                  Disconnect
                </Button>
              )}
            </div>
          </div>
          {state.deviceStatus ===
            Types.DeviceStatusEnum.DEVICE_DISCONNECTED && (
            <form className="space-y-2">
              <Select
                label="Method"
                optionsEnum={connType}
                value={appState.connType}
                onChange={(e): void => {
                  console.log(e.target.value);

                  dispatch(setConnType(parseInt(e.target.value)));
                }}
              />
              {appState.connType === connType.HTTP && <HTTP />}
              {appState.connType === connType.BLE && <BLE />}
              {appState.connType === connType.SERIAL && <Serial />}
            </form>
          )}
        </div>
      </Card>
    </Modal>
  );
};
