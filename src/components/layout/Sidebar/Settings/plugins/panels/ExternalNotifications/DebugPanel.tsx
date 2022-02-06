import type React from 'react';

import JSONPretty from 'react-json-pretty';

import { useAppSelector } from '@app/hooks/useAppSelector';
import { CopyButton } from '@components/menu/buttons/CopyButton';

export const ExternalNotificationsDebugPanel = (): JSX.Element => {
  const preferences = useAppSelector(
    (state) => state.meshtastic.radio.preferences,
  );

  const debugData = {
    extNotificationPluginActive: preferences.extNotificationPluginActive,
    extNotificationPluginAlertBell: preferences.extNotificationPluginAlertBell,
    extNotificationPluginAlertMessage:
      preferences.extNotificationPluginAlertMessage,
    extNotificationPluginEnabled: preferences.extNotificationPluginEnabled,
    extNotificationPluginOutput: preferences.extNotificationPluginOutput,
    extNotificationPluginOutputMs: preferences.extNotificationPluginOutputMs,
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
