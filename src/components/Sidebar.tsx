import React from 'react';

import type {
  IHTTPConnection,
  Protobuf,
  Types,
} from '@meshtastic/meshtasticjs';

import type { LanguageEnum, languageTemplate } from '../App';
import SidebarChannels from './Sidebar/SidebarChannels';
import SidebarDeviceSettings from './Sidebar/SidebarDeviceSettings';
import SidebarNodes from './Sidebar/SidebarNodes';
import SidebarUISettings from './Sidebar/SidebarUISettings';

interface SidebarProps {
  IsReady: boolean;
  Nodes: Types.NodeInfoPacket[];
  Channels: Protobuf.Channel[];
  Preferences: Protobuf.RadioConfig_UserPreferences;
  Connection: IHTTPConnection;
  MobileNavOpen: boolean;
  Language: LanguageEnum;
  SetLanguage: Function;
  Translations: languageTemplate;
  myId: number;
}

const Sidebar = (props: SidebarProps) => {
  const updatePreferences = () => {};

  return (
    <div
      className={`flex flex-col rounded-md m-3 md:ml-0 shadow-md w-full max-w-sm ${
        !props.MobileNavOpen ? 'hidden' : 'visible'
      }`}
    >
      <SidebarNodes
        IsReady={props.IsReady}
        Nodes={props.Nodes}
        Translations={props.Translations}
        myId={props.myId}
      />
      <SidebarDeviceSettings
        IsReady={props.IsReady}
        Preferences={props.Preferences}
        Connection={props.Connection}
        Translations={props.Translations}
      />
      <SidebarChannels
        IsReady={props.IsReady}
        Channels={props.Channels}
        Translations={props.Translations}
      />
      <div className="flex-grow border-b"></div>
      <SidebarUISettings
        Language={props.Language}
        SetLanguage={props.SetLanguage}
        Translations={props.Translations}
      />
    </div>
  );
};

export default Sidebar;
