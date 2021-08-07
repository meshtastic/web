import React from 'react';

import { useTranslation } from 'react-i18next';

import { Input } from '../components/form/Input';
import { Toggle } from '../components/form/Toggle';
import { PrimaryTemplate } from '../components/templates/PrimaryTemplate';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
  setHostOverride,
  setHostOverrideEnabled,
} from '../slices/meshtasticSlice';

export const Settings = (): JSX.Element => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const radioConfig = useAppSelector((state) => state.meshtastic.preferences);
  const hostOverride = useAppSelector((state) => state.meshtastic.hostOverride);
  const hostOverrideEnabled = useAppSelector(
    (state) => state.meshtastic.hostOverrideEnabled,
  );

  const [localHostOverride, setLocalHostOverride] =
    React.useState(hostOverride);
  const [localHostOverrideEnabled, setLocalHostOverrideEnabled] =
    React.useState(hostOverrideEnabled);

  return (
    <PrimaryTemplate title="Settings" tagline="Device">
      <div className="flex mb-8 dark:text-white">
        <div className="w-1/3 text-lg">WiFi</div>
        <div className="space-y-2">
          <Input
            name={t('strings.wifi_ssid')}
            value={radioConfig.wifiSsid}
            onChange={(event) => {}}
            type="text"
            valid={true}
          />
          <Input
            name={t('strings.wifi_psk')}
            value={radioConfig.wifiPassword}
            onChange={(event) => {}}
            type="password"
            valid={true}
          />
        </div>
      </div>
      <div className="flex dark:text-white">
        <div className="w-1/3 text-lg">Client</div>
        <div className="space-y-2">
          <Toggle
            enabled={localHostOverrideEnabled}
            setEnabled={(state) => {
              setLocalHostOverrideEnabled(state);
            }}
          />
          <Input
            name={'Host override'}
            placeholder={'meshtastic.local'}
            value={localHostOverride}
            onChange={(event) => {
              setLocalHostOverride(event.target.value);
            }}
            type="text"
            valid={true}
            disabled={!localHostOverrideEnabled}
          />
        </div>
      </div>

      <button
        onClick={() => {
          dispatch(setHostOverride(localHostOverride));
          dispatch(setHostOverrideEnabled(localHostOverrideEnabled));
        }}
        className="w-full rounded-md dark:bg-primaryDark shadow-md border dark:border-gray-600 p-2 mt-6 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-900"
      >
        {t('strings.save_changes')}
      </button>
    </PrimaryTemplate>
  );
};
