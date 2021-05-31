import React from 'react';

import { ObservableResource, useObservableSuspense } from 'observable-hooks';
import { useForm } from 'react-hook-form';
import JSONPretty from 'react-json-pretty';
import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

import { SaveIcon } from '@heroicons/react/outline';
import type {
  IBLEConnection,
  IHTTPConnection,
  ISerialConnection,
  Types,
} from '@meshtastic/meshtasticjs';
import { Protobuf } from '@meshtastic/meshtasticjs';

import type { languageTemplate } from '../../../../src/App';

export interface SettingsProps {
  isReady: boolean;
  connection: ISerialConnection | IHTTPConnection | IBLEConnection;
  translations: languageTemplate;
}

export interface SettingsPropsNew {
  isReady: boolean;
  connection: ISerialConnection | IHTTPConnection | IBLEConnection;
  translations: languageTemplate;
  adminPacketResource: ObservableResource<Types.AdminPacket, Types.AdminPacket>;
}

const Settings = (props: SettingsProps): JSX.Element => {
  // const adminPacketResource = useSuspense(props.connection.onAdminPacketEvent);
  const tmp$ = new Subject<Types.AdminPacket>().pipe(
    filter(
      (adminPacket) =>
        adminPacket.data.variant.oneofKind === 'getRadioResponse',
    ),
  );
  // const tmp$ = props.connection.onAdminPacketEvent;

  const adminPacketResource = new ObservableResource(tmp$);

  return (
    <React.Suspense fallback={<div>Loading....</div>}>
      <SettingsForm
        connection={props.connection}
        isReady={props.isReady}
        translations={props.translations}
        adminPacketResource={adminPacketResource}
      />
    </React.Suspense>
  );
};

const SettingsForm = (props: SettingsPropsNew): JSX.Element => {
  // const adminPacket: Types.AdminPacket = props.adminPacketResource.data.read();
  const adminPacket = useObservableSuspense(props.adminPacketResource);

  const [preferences, setPreferences] =
    React.useState<Protobuf.RadioConfig_UserPreferences>();
  const { register, handleSubmit } =
    useForm<Protobuf.RadioConfig_UserPreferences>({
      defaultValues: preferences,
    });

  const onSubmit = handleSubmit((data) => console.log(data));
  return (
    <form onSubmit={onSubmit}>
      <div>{JSON.stringify(adminPacket)}</div>
      <div className="flex bg-gray-50 whitespace-nowrap p-3 justify-between border-b">
        <div className="my-auto">{props.translations.device_region_title}</div>
        <div className="flex shadow-md rounded-md ml-2">
          <select value={preferences?.region ?? Protobuf.RegionCode.Unset}>
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
