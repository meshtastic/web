import React from 'react';

import type {
  IBLEConnection,
  IHTTPConnection,
  ISerialConnection,
} from '@meshtastic/meshtasticjs';

import Channels from './Sidebar/Channels/Index';
import Device from './Sidebar/Device/Index';
import Nodes from './Sidebar/Nodes/Index';
import UI from './Sidebar/UI/Index';

interface SidebarProps {
  myId: number;
  sidebarOpen: boolean;
  darkmode: boolean;
  setDarkmode: React.Dispatch<React.SetStateAction<boolean>>;
  connection: ISerialConnection | IHTTPConnection | IBLEConnection;
}

const Sidebar = (props: SidebarProps): JSX.Element => {
  return (
    <div
      className={`${
        props.sidebarOpen ? 'flex' : 'hidden md:flex'
      } flex-col rounded-md md:ml-0 shadow-md border w-full max-w-sm`}
    >
      <Nodes myId={props.myId} />
      <Device connection={props.connection} />
      <Channels />
      <div className="flex-grow border-b"></div>
      <UI darkmode={props.darkmode} setDarkmode={props.setDarkmode} />
    </div>
  );
};

export default Sidebar;
