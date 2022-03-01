import type React from 'react';

import { AnimatePresence, AnimateSharedLayout, m } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';

import { IconButton } from '@components/generic/button/IconButton';

export interface SidebarOverlayProps {
  title: string;
  open: boolean;
  close: () => void;
  direction: 'x' | 'y';
  children: React.ReactNode;
}

export const SidebarOverlay = ({
  title,
  open,
  close,
  direction,
  children,
}: SidebarOverlayProps): JSX.Element => {
  return (
    <AnimatePresence>
      {open && (
        <m.div
          className="absolute z-30 flex h-full w-full flex-col bg-white dark:bg-primaryDark"
          animate={direction === 'x' ? { translateX: 0 } : { translateY: 0 }}
          initial={
            direction === 'x' ? { translateX: '-100%' } : { translateY: '100%' }
          }
          exit={
            direction === 'x' ? { translateX: '-100%' } : { translateY: '100%' }
          }
          transition={{ type: 'just' }}
        >
          <AnimateSharedLayout>
            {/* <div className="flex gap-2 border-b border-gray-400 p-2 dark:border-gray-600"> */}
            <div className="bg-white px-1 pt-1 drop-shadow-md dark:bg-primaryDark">
              <div className="flex h-10 gap-1">
                <div className="my-auto">
                  <IconButton
                    onClick={(): void => {
                      close();
                    }}
                    icon={<FiArrowLeft />}
                  />
                </div>
                <div className="my-auto text-lg font-medium dark:text-white">
                  {title}
                </div>
              </div>
            </div>
            <div className="flex-grow overflow-y-auto">{children}</div>
          </AnimateSharedLayout>
        </m.div>
      )}
    </AnimatePresence>
  );
};
