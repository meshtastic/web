import React from 'react';

import { ObservableResource, useObservableSuspense } from 'observable-hooks';
import { useForm } from 'react-hook-form';
import JSONPretty from 'react-json-pretty';
import type { languageTemplate } from 'src/App';

import { SaveIcon } from '@heroicons/react/outline';
import { IHTTPConnection, Protobuf } from '@meshtastic/meshtasticjs';

export interface SettingsProps {
  isReady: boolean;
  connection: IHTTPConnection;
  translations: languageTemplate;
}

const Settings = (props: SettingsProps) => {
  React.useEffect(() => {
    const a = useObservableSuspense(
      new ObservableResource(
        props.connection.onAdminPacketEvent.asObservable(),
      ),
    );
    const adminPacketEvent = props.connection.onAdminPacketEvent.subscribe(
      (adminMessage) => {
        switch (adminMessage.data.variant.oneofKind) {
          case 'getRadioResponse':
            if (adminMessage.data.variant.getRadioResponse.preferences) {
              setPreferences(
                adminMessage.data.variant.getRadioResponse.preferences,
              );
            }
        }
      },
    );

    return () => adminPacketEvent.unsubscribe();
  }, []);

  const [
    preferences,
    setPreferences,
  ] = React.useState<Protobuf.RadioConfig_UserPreferences>();
  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<Protobuf.RadioConfig_UserPreferences>({
    defaultValues: preferences,
  });

  const onSubmit = handleSubmit((data) => console.log(data));

  return (
    <form onSubmit={onSubmit}>
      <div className="flex bg-gray-50 whitespace-nowrap p-3 justify-between border-b">
        <div className="my-auto">{props.translations.device_region_title}</div>
        <div className="flex shadow-md rounded-md ml-2">
          <select
            value={preferences.region ?? Protobuf.RegionCode.Unset}
            // onChange={(e) => {
            //   preferences.region = parseInt(e.target.value);
            // }}
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
        <div className="my-auto">{props.translations.device_wifi_ssid}</div>
        <div className="flex shadow-md rounded-md ml-2">
          <input {...register('wifiSsid', {})} type="text" />
        </div>
      </div>
      <div className="flex bg-gray-50 whitespace-nowrap p-3 justify-between border-b">
        <div className="my-auto">{props.translations.device_wifi_psk}</div>
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
          {props.translations.save_changes_button}
        </button>
      </div>
      <JSONPretty data={preferences} />
    </form>
  );
};

export default Settings;
