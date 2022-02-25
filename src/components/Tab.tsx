import type React from 'react';

import type { Link } from 'type-route';

export interface TabProps {
  link?: Link;
  icon: React.ReactNode;
  title: string;
  active: boolean;
}

export const Tab = ({ link, icon, title, active }: TabProps): JSX.Element => {
  return (
    <div className="group relative flex-grow">
      <div
        className={`peer flex cursor-pointer select-none py-1 dark:text-white ${
          active
            ? 'z-10 -mr-1 rounded-t-lg bg-gray-100 dark:bg-primaryDark'
            : 'dark:bg-secondaryDark'
        }`}
        {...(link && link)}
      >
        <div
          className={`w-full px-2 ${
            active ? '' : 'border-l group-first:border-l-0 dark:border-gray-600'
          }`}
        >
          <div className="flex gap-2">
            <div className="my-auto">{icon}</div>
            {title}
          </div>
        </div>
      </div>
    </div>
  );
};
