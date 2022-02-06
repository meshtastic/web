import type React from 'react';

import JSONPretty from 'react-json-pretty';

import { useAppSelector } from '@app/hooks/useAppSelector';
import { CopyButton } from '@components/menu/buttons/CopyButton';

export const SerialDebugPanel = (): JSX.Element => {
  const preferences = useAppSelector(
    (state) => state.meshtastic.radio.preferences,
  );

  const debugData = {
    serialpluginEnabled: preferences.serialpluginEnabled,
    serialpluginEcho: preferences.serialpluginEcho,
    serialpluginMode: preferences.serialpluginMode,
    serialpluginRxd: preferences.serialpluginRxd,
    serialpluginTxd: preferences.serialpluginTxd,
    serialpluginTimeout: preferences.serialpluginTimeout,
  };

  return (
    <>
      <div className="fixed right-0 m-2">
        <CopyButton data={JSON.stringify(debugData)} />
      </div>
      <JSONPretty className="max-w-sm" data={debugData} />
    </>
  );
};
