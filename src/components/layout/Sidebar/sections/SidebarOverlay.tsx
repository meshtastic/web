import type React from 'react';

import { AnimatePresence, AnimateSharedLayout, m } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';

import { IconButton } from '@meshtastic/components';

export interface SidebarOverlayProps {
  title: string;
  open: boolean;
  close: () => void;
  children: React.ReactNode;
}

export const SidebarOverlay = ({
  title,
  open,
  close,
  children,
}: SidebarOverlayProps): JSX.Element => {
  return (
    <AnimatePresence>
      {open && (
        <m.div
          className="absolute z-20 flex flex-col w-full h-full bg-primaryDark"
          animate={{ translateX: 0 }}
          initial={{ translateX: '-100%' }}
          exit={{ translateX: '-100%' }}
          transition={{ type: 'just' }}
        >
          <AnimateSharedLayout>
            <div className="flex gap-2 p-2 border-b border-gray-300 dark:border-gray-600">
              <IconButton
                onClick={(): void => {
                  close();
                }}
                icon={<FiArrowLeft />}
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
