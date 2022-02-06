import type React from 'react';

import { AnimatePresence, AnimateSharedLayout, m } from 'framer-motion';
import { FiArrowDown } from 'react-icons/fi';

import { IconButton } from '@meshtastic/components';

export interface SidebarPrimaryProps {
  title: string;
  open: boolean;
  close: () => void;
  children: React.ReactNode;
}

export const SidebarPrimary = ({
  title,
  open,
  close,
  children,
}: SidebarPrimaryProps): JSX.Element => {
  return (
    <AnimatePresence>
      {open && (
        <m.div
          className="absolute flex h-full w-full flex-col bg-gray-100 dark:bg-primaryDark"
          animate={{ translateY: 0 }}
          initial={{ translateY: '100%' }}
          exit={{ translateY: '100%' }}
          transition={{ type: 'just' }}
        >
          <AnimateSharedLayout>
            <div className="flex gap-2 p-2">
              <IconButton
                onClick={(): void => {
                  close();
                }}
                icon={<FiArrowDown />}
              />
              <div className="my-auto text-lg font-medium dark:text-white">
                {title}
              </div>
            </div>

            <div className="flex-grow overflow-y-auto">{children}</div>
          </AnimateSharedLayout>
        </m.div>
      )}
    </AnimatePresence>
  );
};
