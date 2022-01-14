import type React from 'react';

import { Tab } from '@headlessui/react';

export interface TabButtonProps {
  children: React.ReactNode;
}

export const TabButton = ({ children }: TabButtonProps): JSX.Element => {
  return (
    <Tab
      className={({ selected }): string =>
        `border-gray-300 hover:border-b-2 dark:border-gray-600 w-full ${
          selected ? 'border-b-2' : 'border-b-0'
        } `
      }
    >
      <div className="my-auto text-gray-500 group dark:text-gray-400">
        <div className="flex p-2 rounded-t-md hover:bg-gray-200 dark:hover:bg-gray-600">
          <div className="m-auto transition duration-200 ease-in-out group-active:scale-90">
            {children}
          </div>
        </div>
      </div>
    </Tab>
  );
};
