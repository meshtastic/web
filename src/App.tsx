import { useState } from 'react';

import { MapProvider } from 'react-map-gl';

import { DeviceWrapper } from '@app/DeviceWrapper.js';
import { PageRouter } from '@app/PageRouter.js';
import { CommandPalette } from '@components/CommandPalette.js';
import { Dashboard } from '@components/Dashboard.js';
import { DeviceSelector } from '@components/DeviceSelector.js';
import { DialogManager } from '@components/Dialog/DialogManager.js';
import { NewDeviceDialog } from '@components/Dialog/NewDeviceDialog.js';
import { ThemeController } from '@components/generic/ThemeController.js';
import { Toaster } from '@components/Toaster.js';
import { useAppStore } from '@core/stores/appStore.js';
import { useDeviceStore } from '@core/stores/deviceStore.js';
import { ISerialConnection } from '@meshtastic/meshtasticjs';

import { subscribeAll } from './core/subscriptions';
import { randId } from './core/utils/randId';

let ensureOnce = false;

export const App = (): JSX.Element => {
  const { getDevice, getDevices, removeDevice } = useDeviceStore();
  const { addDevice } = useDeviceStore();
  const { selectedDevice, setConnectDialogOpen, connectDialogOpen, setSelectedDevice } =
    useAppStore();
  const [initialized, setInitialized] = useState(false);

  const device = getDevice(selectedDevice);

  const onConnect = async (port: SerialPort) => {
    const id = randId();
    const device = addDevice(id);
    const connection = new ISerialConnection(id);
    console.log("conn");
    await connection
      .connect({
        port,
        baudRate: undefined,
        concurrentLogOutput: true
      })
      .catch((e: Error) => console.log(`Unable to Connect: ${e.message}`));
    device.addConnection(connection);
    subscribeAll(device, connection);
  };
  const connectToAll = async () => {
    const dev = await navigator.serial.getPorts();

    navigator.serial.onconnect = (ev) => {
      const port = ev.target as SerialPort;
      if(port.readable === null)
        onConnect(port);
    };
    navigator.serial.ondisconnect = (ev) => {
      const port = ev.target as SerialPort;
      const device = getDevices().filter(d => d.connection?.connType == 'serial');
      const d = device.find(d => (d.connection! as ISerialConnection).getCurrentPort() == port);
      if(!d)
        return;
      d.connection!.disconnect();
      removeDevice(d.id ?? 0);
      if(selectedDevice == d.id)
        setSelectedDevice(0);
    }
    dev.filter(d => d.readable === null).forEach(d => onConnect(d));
  };
  if(!initialized && !ensureOnce) {
    connectToAll();
    setInitialized(true);
    ensureOnce = true;
  }

  return (
    <ThemeController>
      <NewDeviceDialog
        open={connectDialogOpen}
        onOpenChange={(open) => {
          setConnectDialogOpen(open);
        }}
      />
      <Toaster />
      <MapProvider>
        <DeviceWrapper device={device}>
          <div className="flex h-screen flex-col overflow-hidden bg-backgroundPrimary text-textPrimary">
            <div className="flex flex-grow">
              <DeviceSelector />
              <div className="flex h-screen flex-col w-full">
                {device ? (
                  <div className="flex h-screen">
                    <DialogManager />
                    <CommandPalette />
                    <PageRouter />
                  </div>
                ) : (
                  <Dashboard />
                )}
              </div>
            </div>
          </div>
        </DeviceWrapper>
      </MapProvider>
    </ThemeController>
  );
};
