import type React from 'react';
import { useState } from 'react';

import { AnimatePresence, m } from 'framer-motion';
import { FiArrowUp } from 'react-icons/fi';

export interface CollapsibleSectionProps {
  title: string;
  icon?: JSX.Element;
  status?: boolean;
  children: JSX.Element;
}

export const CollapsibleSection = ({
  title,
  icon,
  status,
  children,
}: CollapsibleSectionProps): JSX.Element => {
  const [open, setOpen] = useState(false);
  const toggleOpen = (): void => setOpen(!open);
  return (
    <m.div>
      <m.div
        layout
        onClick={toggleOpen}
        className={`w-full cursor-pointer select-none overflow-hidden border-l-4 border-b bg-gray-200 p-2 text-sm font-medium dark:border-primaryDark dark:bg-tertiaryDark dark:text-gray-400 ${
          open
            ? 'border-l-primary dark:border-l-primary'
            : 'border-gray-400 dark:border-secondaryDark'
        }`}
      >
        <m.div
          layout
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="my-auto flex justify-between gap-2"
        >
          <m.div className="flex gap-2">
            <m.div className="my-auto flex gap-2">
              {status !== undefined ? (
                <>
                  {icon}
                  <div
                    className={`h-3 w-3 rounded-full ${
                      status ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                </>
              ) : (
                <>{icon}</>
              )}
            </m.div>
            {title}
          </m.div>
          <m.div
            animate={open ? 'open' : 'closed'}
            initial={{ rotate: 180 }}
            variants={{
              open: { rotate: 0 },
              closed: { rotate: 180 },
            }}
            transition={{ type: 'just' }}
            className="my-auto"
          >
            <FiArrowUp />
          </m.div>
        </m.div>
      </m.div>
      <AnimatePresence>
        {open && (
          <m.div
            className="p-2"
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
};
