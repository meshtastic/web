import React from 'react';

import type {
  IBLEConnection,
  IHTTPConnection,
  ISerialConnection,
} from '@meshtastic/meshtasticjs';

import { useAppSelector } from '../hooks/redux';
import { Channels } from './Sidebar/Channels/Index';
import { Device } from './Sidebar/Device/Index';
import { Nodes } from './Sidebar/Nodes/Index';
import { UI } from './Sidebar/UI/Index';

interface SidebarProps {
  connection: ISerialConnection | IHTTPConnection | IBLEConnection;
}

export const Sidebar = (props: SidebarProps): JSX.Element => {
  const sidebarOpen = useAppSelector((state) => state.app.sidebarOpen);
  return (
    <div
      className={`${
        sidebarOpen ? 'flex' : 'hidden md:flex'
      } flex-col rounded-md md:ml-0 shadow-md border w-full max-w-sm`}
    >
      <Nodes />
      <Device connection={props.connection} />
      <Channels />
      <div className="flex-grow border-b"></div>
      <UI />
    </div>
  );
};
