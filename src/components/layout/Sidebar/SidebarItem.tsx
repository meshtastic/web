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
    <m.div
      onClick={(): void => {
        setSelected();
      }}
      animate={selected ? 'selected' : 'deselected'}
      initial={{ borderColor: '#1C1D23' }}
      variants={{
        selected: { borderColor: '#67ea94' },
        deselected: { borderColor: '#1C1D23' },
      }}
      className="mx-2 flex cursor-pointer select-none rounded-md border-2 p-2 first:mt-2 last:mb-2 dark:bg-secondaryDark"
    >
      <m.div
        className="flex w-full justify-between"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex gap-2">{children}</div>

        <div className="flex gap-1">{actions}</div>
      </m.div>
    </m.div>
  );
};
