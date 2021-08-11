import React from 'react';

import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Protobuf } from '@meshtastic/meshtasticjs';

import { Input } from '../components/form/Input';
import { Select } from '../components/form/Select';
import { Switch } from '../components/form/Switch';
import { PrimaryTemplate } from '../components/templates/PrimaryTemplate';
import { connection } from '../core/connection';
import {
  setHostOverride,
  setHostOverrideEnabled,
} from '../core/slices/meshtasticSlice';
import { useAppDispatch, useAppSelector } from '../hooks/redux';

export const Settings = (): JSX.Element => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const radioConfig = useAppSelector((state) => state.meshtastic.preferences);
  const hostOverride = useAppSelector((state) => state.meshtastic.hostOverride);
  const hostOverrideEnabled = useAppSelector(
    (state) => state.meshtastic.hostOverrideEnabled,
  );

  const { register, handleSubmit, control } =
    useForm<Protobuf.RadioConfig_UserPreferences>({
      defaultValues: radioConfig,
    });

  const onSubmit = handleSubmit((data) => {
    console.log(data);
    connection.setPreferences(data);
  });

  const [localHostOverride, setLocalHostOverride] =
    React.useState(hostOverride);
  const [localHostOverrideEnabled, setLocalHostOverrideEnabled] =
    React.useState(hostOverrideEnabled);

  return (
    <PrimaryTemplate title="Settings" tagline="Device">
      <form onSubmit={onSubmit}>
        <div className="space-y-4">
          <div className="flex pb-2 dark:text-white border-b dark:border-gray-600">
            <div className="w-1/3 text-lg">WiFi</div>
            <div className="space-y-2 w-full max-w-xs">
              <Input
                label={t('strings.wifi_ssid')}
                {...register('wifiSsid', {})}
                type="text"
                valid={true}
              />
              <Input
                label={t('strings.wifi_psk')}
                {...register('wifiPassword', {})}
                type="password"
                valid={true}
              />
            </div>
          </div>
          <div className="flex pb-2 dark:text-white border-b dark:border-gray-600">
            <div className="w-1/3 text-lg">Node</div>
            <div className="space-y-2 w-full max-w-xs">
              <Switch
                name={'isRouter'}
                control={control}
                label={'Is Router Node?'}
              />

              <Switch
                name={'isLowPower'}
                control={control}
                label={'Is Low Power?'}
              />

              <Switch
                name={'fixedPosition'}
                control={control}
                label={'Has Fixed Position?'}
              />

              <Switch
                name={'serialDisabled'}
                control={control}
                label={'Is Serial Disabled?'}
              />

              <Switch
                name={'mqttDisabled'}
                control={control}
                label={'Is MQTT Disabled?'}
              />

              <Switch
                name={'debugLogEnabled'}
                control={control}
                label={'Is Debug Log Enabled?'}
              />

              <Select
                name={'region'}
                control={control}
                label="Region"
                options={(() => {
                  return Object.keys(Protobuf.RegionCode)
                    .filter((value) => isNaN(Number(value)) === false)
                    .map((key) => {
                      return {
                        value: key,
                        label: Protobuf.RegionCode[parseInt(key)],
                      };
                    });
                })()}
              />
            </div>
          </div>
          <div className="flex pb-2 dark:text-white border-b dark:border-gray-600">
            <div className="w-1/3 text-lg">Client</div>
            <div className="space-y-2 w-full max-w-xs">
              {/* <Toggle
                label={'Enable host override'}
                checked={localHostOverrideEnabled}
                onChange={(event) => {
                  console.log(event.target.checked);
                  setLocalHostOverrideEnabled(event.target.checked);
                }}
              /> */}
              <Input
                label={'Host override'}
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
        </div>

        <button
          type="submit"
          onClick={() => {
            dispatch(setHostOverride(localHostOverride));
            dispatch(setHostOverrideEnabled(localHostOverrideEnabled));
          }}
          className="w-full rounded-md dark:bg-primaryDark shadow-md border dark:border-gray-600 p-2 mt-6 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-900"
        >
          {t('strings.save_changes')}
        </button>
      </form>
    </PrimaryTemplate>
  );
};
