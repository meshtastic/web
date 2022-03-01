import type React from 'react';
import { useState } from 'react';

import { m } from 'framer-motion';
import { FiChevronRight } from 'react-icons/fi';

export interface ExternalSectionProps {
  title: string;
  icon?: JSX.Element;
  active?: boolean;
  onClick: () => void;
}

export const ExternalSection = ({
  title,
  icon,
  active,
  onClick,
}: ExternalSectionProps): JSX.Element => {
  const [open, setOpen] = useState(false);
  const toggleOpen = (): void => setOpen(!open);
  return (
    <m.div
      onClick={(): void => {
        onClick();
      }}
    >
      <m.div
        layout
        className={`w-full cursor-pointer select-none overflow-hidden border-l-4 bg-gray-200 dark:bg-tertiaryDark dark:text-gray-400 ${
          active
            ? 'border-l-primary dark:border-l-primary'
            : 'border-gray-400 dark:border-secondaryDark'
        }`}
      >
        <m.div
          layout
          onClick={toggleOpen}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="flex justify-between gap-2 border-b border-gray-400 p-2 text-sm font-medium dark:border-primaryDark"
        >
          <m.div className="flex gap-2 ">
            <m.div className="my-auto">{icon}</m.div>
            {title}
          </m.div>
          <m.div className="my-auto">
            <FiChevronRight />
          </m.div>
        </m.div>
      </m.div>
    </m.div>
  );
};
