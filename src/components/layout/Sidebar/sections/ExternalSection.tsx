import React from 'react';

import { m } from 'framer-motion';
import { FiExternalLink } from 'react-icons/fi';

export interface ExternalSectionProps {
  title: string;
  icon?: JSX.Element;
  onClick: () => void;
}

export const ExternalSection = ({
  title,
  icon,
  onClick,
}: ExternalSectionProps): JSX.Element => {
  const [open, setOpen] = React.useState(false);
  const toggleOpen = (): void => setOpen(!open);
  return (
    <m.div
      onClick={(): void => {
        onClick();
      }}
    >
      <m.div
        layout
        className="w-full cursor-pointer select-none overflow-hidden shadow-md dark:bg-secondaryDark dark:text-gray-400"
      >
        <m.div
          layout
          onClick={toggleOpen}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="flex justify-between gap-2 border-b border-primaryDark p-2 text-sm font-medium"
        >
          <m.div className="flex gap-2 ">
            <m.div className="my-auto">{icon}</m.div>
            {title}
          </m.div>
          <m.div className="my-auto">
            <FiExternalLink />
          </m.div>
        </m.div>
      </m.div>
    </m.div>
  );
};
