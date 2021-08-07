import React from 'react';

import { useTranslation } from 'react-i18next';

import { Input } from '../components/form/Input';
import { PrimaryTemplate } from '../components/templates/PrimaryTemplate';
import { useAppSelector } from '../hooks/redux';

export const Settings = (): JSX.Element => {
  const { t } = useTranslation();
  const radioConfig = useAppSelector((state) => state.meshtastic.preferences);

  console.log(radioConfig);

  return (
    <PrimaryTemplate title="Settings" tagline="Device">
      <div className="flex">
        <div className="w-1/3 text-lg">WiFi</div>
        <div className="space-y-2">
          <Input
            name={t('strings.wifi_ssid')}
            value={radioConfig.wifiSsid}
            type="text"
            valid={true}
          />
          <Input
            name={t('strings.wifi_psk')}
            value={radioConfig.wifiPassword}
            type="text"
            valid={true}
          />
        </div>
      </div>
    </PrimaryTemplate>
  );
};
