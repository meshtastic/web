import type React from 'react';

import JSONPretty from 'react-json-pretty';

import { useAppSelector } from '@app/hooks/useAppSelector';
import { CopyButton } from '@components/menu/buttons/CopyButton';
import { Tab } from '@headlessui/react';

export const StoreForwardDebugPanel = (): JSX.Element => {
  const preferences = useAppSelector(
    (state) => state.meshtastic.radio.preferences,
  );

  const debugData = {
    storeForwardPluginEnabled: preferences.storeForwardPluginEnabled,
    storeForwardPluginHeartbeat: preferences.storeForwardPluginHeartbeat,
    storeForwardPluginRecords: preferences.storeForwardPluginRecords,
    storeForwardPluginHistoryReturnMax:
      preferences.storeForwardPluginHistoryReturnMax,
    storeForwardPluginHistoryReturnWindow:
      preferences.storeForwardPluginHistoryReturnWindow,
  };

  return (
    <Tab.Panel className="relative">
      <div className="fixed right-0 m-2">
        <CopyButton data={JSON.stringify(debugData)} />
      </div>
      <JSONPretty className="max-w-sm" data={debugData} />
    </Tab.Panel>
  );
};
