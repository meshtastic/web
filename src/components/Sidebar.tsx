import React from 'react';

import type {
  IBLEConnection,
  IHTTPConnection,
  ISerialConnection,
} from '@meshtastic/meshtasticjs';

import type { LanguageEnum } from '../translations/TranslationContext';
import Channels from './Sidebar/Channels/Index';
import Device from './Sidebar/Device/Index';
import Nodes from './Sidebar/Nodes/Index';
import UI from './Sidebar/UI/Index';

interface SidebarProps {
  isReady: boolean;
  connection: ISerialConnection | IHTTPConnection | IBLEConnection;
  language: LanguageEnum;
  setLanguage: React.Dispatch<React.SetStateAction<LanguageEnum>>;
  myId: number;
  sidebarOpen: boolean;
  darkmode: boolean;
  setDarkmode: React.Dispatch<React.SetStateAction<boolean>>;
}

const Sidebar = (props: SidebarProps): JSX.Element => {
  return (
    <div
      className={`${
        props.sidebarOpen ? 'flex' : 'hidden md:flex'
      } flex-col rounded-md md:ml-0 shadow-md border w-full max-w-sm`}
    >
      <Nodes myId={props.myId} />
      <Device isReady={props.isReady} connection={props.connection} />
      <Channels />
      <div className="flex-grow border-b"></div>
      <UI
        language={props.language}
        setLanguage={props.setLanguage}
        darkmode={props.darkmode}
        setDarkmode={props.setDarkmode}
      />
    </div>
  );
};

export default Sidebar;
