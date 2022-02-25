import type React from 'react';

import { m } from 'framer-motion';
import type { Link } from 'type-route';

export interface TabProps {
  link: Link;
  icon: React.ReactNode;
  title: string;
  active: boolean;
  activeRight: boolean;
  activeLeft: boolean;
}

export const Tab = ({
  link,
  icon,
  title,
  active,
  activeRight,
  activeLeft,
}: TabProps): JSX.Element => {
  return (
    <div
      className={`max-w-[10rem] md:flex-grow ${
        active ? 'bg-primaryDark' : 'bg-secondaryDark'
      }`}
    >
      <div
        className={`group flex flex-grow cursor-pointer select-none py-2 hover:underline dark:text-white ${
          active
            ? 'z-10 rounded-t-lg bg-gray-300 shadow-inner dark:bg-secondaryDark'
            : 'bg-gray-100 shadow-md dark:bg-primaryDark'
        } ${activeRight ? 'rounded-br-lg' : ''} ${
          activeLeft ? 'rounded-bl-lg' : ''
        }`}
        {...(link && link)}
      >
        <div
          className={`my-auto w-full px-3 ${
            active || activeLeft
              ? ''
              : 'border-l border-gray-400 dark:border-gray-600'
          }`}
        >
          <m.div
            className="flex gap-2"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="my-auto">{icon}</div>
            <div className="hidden md:flex">{title}</div>
          </m.div>
        </div>
      </div>
    </div>
  );
};
