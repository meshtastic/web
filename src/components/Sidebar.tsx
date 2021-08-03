import React from 'react';

import { AnimatePresence, motion } from 'framer-motion';

import { useAppSelector } from '../hooks/redux';
import { Channels } from './Sidebar/Channels/Index';
import { Device } from './Sidebar/Device/Index';
import { Nodes } from './Sidebar/Nodes/Index';
import { UI } from './Sidebar/UI/Index';

export const Sidebar = (): JSX.Element => {
  const sidebarOpen = useAppSelector((state) => state.app.sidebarOpen);

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.div
          className={`${
            sidebarOpen ? 'flex' : 'hidden md:flex'
          } flex-col rounded-md md:ml-0 shadow-md border w-full max-w-sm`}
        >
          <Nodes />
          <Device />
          <Channels />
          <div className="flex-grow border-b"></div>
          <UI />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
