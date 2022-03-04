import type React from 'react';

import { m } from 'framer-motion';

export interface SidebarItemProps {
  selected: boolean;
  setSelected: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const SidebarItem = ({
  selected,
  setSelected,
  actions,
  children,
}: SidebarItemProps): JSX.Element => {
  return (
    <div
      onClick={(): void => {
        setSelected();
      }}
      className={`mx-2 flex cursor-pointer select-none rounded-md border bg-gray-200 p-2 shadow-md first:mt-2 last:mb-2 hover:border-primary dark:bg-tertiaryDark dark:hover:border-primary ${
        selected ? 'border-primary' : 'border-gray-400 dark:border-gray-600'
      }`}
    >
      <m.div
        className="flex w-full justify-between"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex gap-2">{children}</div>

        <div className="flex gap-1">{actions}</div>
      </m.div>
    </div>
  );
};
