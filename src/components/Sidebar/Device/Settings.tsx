import React from 'react';

import { useObservableSuspense } from 'observable-hooks';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { SaveIcon } from '@heroicons/react/outline';
import type {
  IBLEConnection,
  IHTTPConnection,
  ISerialConnection,
} from '@meshtastic/meshtasticjs';
import { Protobuf } from '@meshtastic/meshtasticjs';

import { preferencesResource } from '../../../streams';

interface SettingsProps {
  connection: ISerialConnection | IHTTPConnection | IBLEConnection;
}

export const Settings = (props: SettingsProps): JSX.Element => {
  const { t } = useTranslation();
  const preferences = useObservableSuspense(preferencesResource);

  const { register, handleSubmit } =
    useForm<Protobuf.RadioConfig_UserPreferences>({
      defaultValues: preferences,
    });

  const onSubmit = handleSubmit((data) =>
    props.connection.setPreferences(data),
  );
  return (
    <form onSubmit={onSubmit}>
      <div className="flex bg-gray-50 whitespace-nowrap p-3 justify-between border-b">
        <div className="my-auto">{t('strings.device_region')}</div>
        <div className="flex shadow-md rounded-md ml-2">
          <select
            {...register('region', {
              valueAsNumber: true,
            })}
          >
            <option value={Protobuf.RegionCode.ANZ}>
              {Protobuf.RegionCode[Protobuf.RegionCode.ANZ]}
            </option>
            <option value={Protobuf.RegionCode.CN}>
              {Protobuf.RegionCode[Protobuf.RegionCode.CN]}
            </option>
            <option value={Protobuf.RegionCode.EU433}>
              {Protobuf.RegionCode[Protobuf.RegionCode.EU433]}
            </option>
            <option value={Protobuf.RegionCode.EU865}>
              {Protobuf.RegionCode[Protobuf.RegionCode.EU865]}
            </option>
            <option value={Protobuf.RegionCode.JP}>
              {Protobuf.RegionCode[Protobuf.RegionCode.JP]}
            </option>
            <option value={Protobuf.RegionCode.KR}>
              {Protobuf.RegionCode[Protobuf.RegionCode.KR]}
            </option>
            <option value={Protobuf.RegionCode.TW}>
              {Protobuf.RegionCode[Protobuf.RegionCode.TW]}
            </option>
            <option value={Protobuf.RegionCode.US}>
              {Protobuf.RegionCode[Protobuf.RegionCode.US]}
            </option>
            <option value={Protobuf.RegionCode.Unset}>
              {Protobuf.RegionCode[Protobuf.RegionCode.Unset]}
            </option>
          </select>
        </div>
      </div>
      <div className="flex bg-gray-50 whitespace-nowrap p-3 justify-between border-b">
        <div className="my-auto">{t('strings.wifi_ssid')}</div>
        <div className="flex shadow-md rounded-md ml-2">
          <input {...register('wifiSsid', {})} type="text" />
        </div>
      </div>
      <div className="flex bg-gray-50 whitespace-nowrap p-3 justify-between border-b">
        <div className="my-auto">{t('strings.wifi_psk')}</div>
        <div className="flex shadow-md rounded-md ml-2">
          <input {...register('wifiPassword', {})} type="password" />
        </div>
      </div>
      <div className="flex bg-gray-100 group p-1 cursor-pointer hover:bg-gray-200 border-b">
        <button
          type="submit"
          className="flex m-auto font-medium group-hover:text-gray-700"
        >
          <SaveIcon className="m-auto mr-2 group-hover:text-gray-700 w-5 h-5" />
          {t('strings.save_changes')}
        </button>
      </div>
    </form>
  );
};
