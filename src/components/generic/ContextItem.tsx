import type React from 'react';

import { m } from 'framer-motion';

export interface ContextItem {
  title: string;
  icon: JSX.Element;
}

export const ContextItem = ({ title, icon }: ContextItem): JSX.Element => {
  return (
    <div className="cursor-pointer first:rounded-t-md last:rounded-b-md hover:dark:bg-secondaryDark">
      <m.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="flex gap-2 p-2"
      >
        <div className="my-auto">{icon}</div>
        <div className="truncate">{title}</div>
      </m.div>
    </div>
  );
};
