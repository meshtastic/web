import React from 'react';

import { FiActivity, FiAperture, FiTag } from 'react-icons/fi';

import { ContextItem } from './ContextItem';

export interface ContextMenuProps {
  items?: JSX.Element;
  children: React.ReactNode;
}

export const ContextMenu = ({
  items,
  children,
}: ContextMenuProps): JSX.Element => {
  const [visible, setVisible] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  return (
    <div
      className="h-full"
      onContextMenu={(e): void => {
        e.preventDefault();

        setVisible(false);
        const newPosition = {
          x: e.pageX,
          y: e.pageY,
        };

        setPosition(newPosition);
        setVisible(true);
      }}
      onClick={(): void => {
        setVisible(false);
      }}
    >
      {children}

      {visible && (
        <div
          style={{ top: position.y, left: position.x }}
          className="fixed z-50 w-60 gap-2 divide-y divide-gray-300 rounded-md border border-gray-300 font-medium shadow-md backdrop-blur-xl dark:divide-gray-600 dark:border-gray-600  dark:text-gray-400"
        >
          {items}
          <ContextItem title="Menu item" icon={<FiActivity />} />
          <ContextItem title="Menu item 2" icon={<FiAperture />} />
          <ContextItem
            title="Menu item 3 with a very long name that should wrap"
            icon={<FiTag />}
          />
        </div>
      )}
    </div>
  );
};
