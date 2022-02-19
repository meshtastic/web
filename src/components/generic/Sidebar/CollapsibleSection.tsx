import React from 'react';

import { AnimatePresence, m } from 'framer-motion';
import { FiArrowUp } from 'react-icons/fi';

export interface CollapsibleSectionProps {
  title: string;
  icon?: JSX.Element;
  actions?: JSX.Element;
  children: JSX.Element;
}

export const CollapsibleSection = ({
  title,
  icon,
  actions,
  children,
}: CollapsibleSectionProps): JSX.Element => {
  const [open, setOpen] = React.useState(false);
  const toggleOpen = (): void => setOpen(!open);
  return (
    <m.div>
      <m.div
        layout
        className="w-full cursor-pointer select-none overflow-hidden dark:bg-secondaryDark dark:text-gray-400"
      >
        <m.div
          layout
          onClick={toggleOpen}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="flex justify-between gap-2 border-b border-gray-300 p-2 text-sm font-medium dark:border-primaryDark"
        >
          <m.div className="flex gap-2 ">
            <m.div className="my-auto">{icon}</m.div>
            {title}
          </m.div>
          <m.div
            animate={open ? 'open' : 'closed'}
            initial={{ rotate: 180 }}
            variants={{
              open: { rotate: 0 },
              closed: { rotate: 180 },
            }}
            className="my-auto"
          >
            <FiArrowUp />
          </m.div>
        </m.div>
      </m.div>
      <AnimatePresence>
        {open && (
          <>
            {actions && (
              <m.div className="flex justify-end gap-1 rounded-b-md border-x border-b p-1 dark:border-gray-600">
                {actions}
              </m.div>
            )}
            <m.div
              className="p-2"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {children}
            </m.div>
          </>
        )}
      </AnimatePresence>
    </m.div>
  );
};
