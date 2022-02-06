import type React from 'react';

import JSONPretty from 'react-json-pretty';

import { useAppSelector } from '@app/hooks/useAppSelector';
import { CopyButton } from '@components/menu/buttons/CopyButton';

export const RangeTestDebugPanel = (): JSX.Element => {
  const preferences = useAppSelector(
    (state) => state.meshtastic.radio.preferences,
  );

  const debugData = {
    rangeTestPluginEnabled: preferences.rangeTestPluginEnabled,
    rangeTestPluginSave: preferences.rangeTestPluginSave,
    rangeTestPluginSender: preferences.rangeTestPluginSender,
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
