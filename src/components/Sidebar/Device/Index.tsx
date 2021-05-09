import React from 'react';

import { Disclosure } from '@headlessui/react';
import {
  AdjustmentsIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SaveIcon,
} from '@heroicons/react/outline';
import { IHTTPConnection, Protobuf } from '@meshtastic/meshtasticjs';

import type { languageTemplate } from '../../../App';

interface DeviceProps {
  isReady: boolean;
  preferences: Protobuf.RadioConfig_UserPreferences;
  connection: IHTTPConnection;
  translations: languageTemplate;
}

const Device = (props: DeviceProps) => {
  return (
    <Disclosure>
      {({ open }) => (
        <>
          <Disclosure.Button className="flex w-full text-lg font-medium justify-between p-3 border-b hover:bg-gray-200 cursor-pointer">
            <div className="flex">
              {open ? (
                <ChevronDownIcon className="my-auto w-5 h-5 mr-2" />
              ) : (
                <ChevronRightIcon className="my-auto w-5 h-5 mr-2" />
              )}
              <AdjustmentsIcon className="text-gray-600 my-auto mr-2 w-5 h-5" />
              {props.translations.device_settings_title}
            </div>
          </Disclosure.Button>
          <Disclosure.Panel>
            <>
              <div className="flex bg-gray-50 whitespace-nowrap p-3 justify-between border-b">
                <div className="my-auto">
                  {props.translations.device_region_title}
                </div>
                <div className="flex shadow-md rounded-md ml-2">
                  <select
                    value={
                      props.preferences?.region ?? Protobuf.RegionCode.Unset
                    }
                    onChange={(e) => {
                      props.preferences.region = parseInt(e.target.value);
                    }}
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
                <div className="my-auto">
                  {props.translations.device_wifi_ssid}
                </div>
                <div className="flex shadow-md rounded-md ml-2">
                  <input
                    onChange={() => {}}
                    type="text"
                    value={props.preferences.wifiSsid}
                  />
                </div>
              </div>
              <div className="flex bg-gray-50 whitespace-nowrap p-3 justify-between border-b">
                <div className="my-auto">
                  {props.translations.device_wifi_psk}
                </div>
                <div className="flex shadow-md rounded-md ml-2">
                  <input
                    type="password"
                    value={props.preferences.wifiPassword}
                  />
                </div>
              </div>
              <div className="flex bg-gray-100 group p-1 cursor-pointer hover:bg-gray-200 border-b">
                <div
                  className="flex m-auto font-medium group-hover:text-gray-700"
                  onClick={() => {
                    props.connection.setPreferences(props.preferences);
                  }}
                >
                  <SaveIcon className="m-auto mr-2 group-hover:text-gray-700 w-5 h-5" />
                  {props.translations.save_changes_button}
                </div>
              </div>
            </>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
};

export default Device;
