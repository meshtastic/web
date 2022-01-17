import type React from 'react';

import { FiX } from 'react-icons/fi';

import { IconButton } from '@meshtastic/components';

export interface SidebarProps {
  title: string;
  tagline: string;
  footer?: JSX.Element;
  closeSidebar: () => void;
  children: React.ReactNode;
}

export const Sidebar = ({
  title,
  tagline,
  closeSidebar,
  children,
}: SidebarProps): JSX.Element => {
  return (
    <div className="absolute z-50 flex flex-col w-full h-full bg-white border-l border-gray-300 md:z-10 md:max-w-sm md:static min-w-max dark:border-gray-600 dark:bg-secondaryDark">
      <div className="p-2">
        <div className="flex justify-between">
          <div>
            <h3 className="text-xs font-medium text-gray-400">{title}</h3>
            <h1 className="text-lg font-medium truncate">{tagline}</h1>
          </div>
          <div className="mb-auto">
            <IconButton
              onClick={(): void => {
                closeSidebar();
              }}
              icon={<FiX />}
            />
          </div>
        </div>
      </div>
      {children ?? (
        <div className="flex flex-grow bg-gray-50 dark:bg-primaryDark">
          <div className="m-auto text-lg font-medium">Please select item</div>
        </div>
      )}
    </div>
  );
};
