import type React from 'react';

import { IconButton } from '@meshtastic/components';

export interface ListItemProps {
  selected: boolean;
  selectedIcon: JSX.Element;
  actions?: JSX.Element;
  status: JSX.Element;
  onClick?: () => void;
  children: React.ReactNode;
}

export const ListItem = ({
  selected,
  selectedIcon,
  actions,
  status,
  onClick,
  children,
}: ListItemProps): JSX.Element => {
  return (
    <div
      onClick={(): void => {
        onClick && onClick();
      }}
      className={`flex select-none rounded-md  border bg-gray-100 shadow-md dark:bg-primaryDark ${
        selected
          ? 'border-primary dark:border-primary'
          : 'border-gray-100 dark:border-primaryDark'
      }`}
    >
      <div className="w-3 rounded-l-md bg-green-500" />
      <div className="flex justify-between p-2">
        <div className="my-auto flex space-x-2">
          {status}
          <div className="flex gap-2">{children}</div>
        </div>
        <div className="flex gap-2">
          {actions}
          <IconButton active={selected} icon={selectedIcon} />
        </div>
      </div>
    </div>
  );
};
