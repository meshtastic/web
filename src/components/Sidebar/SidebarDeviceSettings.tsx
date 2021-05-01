import React from 'react';

import { AdjustmentsIcon, SaveIcon } from '@heroicons/react/outline';
import { IHTTPConnection, Protobuf } from '@meshtastic/meshtasticjs';

import type { languageTemplate } from '../../App';
import NavItem from '../NavItem';

interface SidebarDeviceSettingsProps {
  IsReady: boolean;
  Preferences: Protobuf.RadioConfig_UserPreferences;
  Connection: IHTTPConnection;
  Translations: languageTemplate;
}

const SidebarDeviceSettings = (props: SidebarDeviceSettingsProps) => {
  return (
    <NavItem
      isDropdown={true}
      open={false}
      isNested={false}
      titleContent={
        <div className="flex">
          <AdjustmentsIcon className="my-auto mr-2 w-5 h-5" />
          {props.Translations.device_settings_title}
        </div>
      }
      isLoading={!props.IsReady}
      dropdownContent={
        <>
          <div className="flex whitespace-nowrap p-3 justify-between border-b">
            <div className="my-auto">
              {props.Translations.device_region_title}
            </div>
            <div className="flex shadow-md rounded-md ml-2">
              <select
                value={props.Preferences?.region ?? Protobuf.RegionCode.Unset}
                onChange={(e) => {
                  props.Preferences.region = parseInt(e.target.value);
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
          <div className="flex whitespace-nowrap p-3 justify-between border-b">
            <div className="my-auto">{props.Translations.device_wifi_ssid}</div>
            <div className="flex shadow-md rounded-md ml-2">
              <input
                onChange={() => {}}
                type="text"
                value={props.Preferences.wifiSsid}
              />
            </div>
          </div>
          <div className="flex whitespace-nowrap p-3 justify-between border-b">
            <div className="my-auto">{props.Translations.device_wifi_psk}</div>
            <div className="flex shadow-md rounded-md ml-2">
              <input type="password" value={props.Preferences.wifiPassword} />
            </div>
          </div>
          <div className="flex group p-1 bg-gray-100 cursor-pointer hover:bg-gray-200 border-b">
            <div
              className="flex m-auto font-medium group-hover:text-gray-700"
              onClick={() => {
                props.Connection.setPreferences(props.Preferences);
              }}
            >
              <SaveIcon className="m-auto mr-2 group-hover:text-gray-700 w-5 h-5" />
              {props.Translations.save_changes_button}
            </div>
          </div>
        </>
      }
    />
  );
};

export default SidebarDeviceSettings;
