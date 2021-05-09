import React from 'react';

import type {
  IHTTPConnection,
  Protobuf,
  Types,
} from '@meshtastic/meshtasticjs';

import type { LanguageEnum, languageTemplate } from '../App';
import Channels from './Sidebar/Channels/Index';
import Device from './Sidebar/Device/Index';
import Nodes from './Sidebar/Nodes/Index';
import UI from './Sidebar/UI/Index';

interface SidebarProps {
  isReady: boolean;
  nodes: Types.NodeInfoPacket[];
  channels: Protobuf.Channel[];
  preferences: Protobuf.RadioConfig_UserPreferences;
  connection: IHTTPConnection;
  language: LanguageEnum;
  setLanguage: React.Dispatch<React.SetStateAction<LanguageEnum>>;
  translations: languageTemplate;
  myId: number;
  sidebarOpen: boolean;
  darkmode: boolean;
  setDarkmode: React.Dispatch<React.SetStateAction<boolean>>;
}

const Sidebar = (props: SidebarProps) => {
  return (
    <div
      className={`${
        props.sidebarOpen ? 'flex' : 'hidden md:flex'
      } flex-col rounded-md md:ml-0 shadow-md border w-full max-w-sm`}
    >
      <Nodes
        isReady={props.isReady}
        nodes={props.nodes}
        translations={props.translations}
        myId={props.myId}
      />
      <Device
        isReady={props.isReady}
        preferences={props.preferences}
        connection={props.connection}
        translations={props.translations}
      />
      <Channels
        isReady={props.isReady}
        channels={props.channels}
        translations={props.translations}
      />
      <div className="flex-grow border-b"></div>
      <UI
        language={props.language}
        setLanguage={props.setLanguage}
        translations={props.translations}
        darkmode={props.darkmode}
        setDarkmode={props.setDarkmode}
      />
    </div>
  );
};

export default Sidebar;
