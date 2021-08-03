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
          initial={{
            height: 0,
          }}
          animate={{
            height: 'auto',
          }}
          exit={{
            height: 0,
          }}
          className="flex flex-col rounded-3xl md:ml-0 shadow-md border w-full md:max-w-sm"
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
