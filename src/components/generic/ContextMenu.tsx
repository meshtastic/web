import React from 'react';

import { m } from 'framer-motion';
import { FiActivity, FiAperture, FiTag } from 'react-icons/fi';

export interface ContextMenuProps {
  children: React.ReactNode;
}

export const ContextMenu = ({ children }: ContextMenuProps): JSX.Element => {
  const [visible, setVisible] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [selectedValue, setSelectedValue] = React.useState<string>();
  const doSomething = (selectedValue: string) => {
    setSelectedValue(selectedValue);
  };

  const showContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();

    setVisible(false);
    const newPosition = {
      x: event.pageX,
      y: event.pageY,
    };

    setPosition(newPosition);
    setVisible(true);
  };

  const hideContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    setVisible(false);
  };

  return (
    <div
      className="h-full"
      onContextMenu={showContextMenu}
      onClick={hideContextMenu}
    >
      {children}
      {selectedValue && <h1>{selectedValue} is selected</h1>}

      {visible && (
        <div
          style={{ top: position.y, left: position.x }}
          className="fixed z-50 w-60 gap-2 divide-y divide-gray-300 rounded-md border border-gray-300 font-medium shadow-md backdrop-blur-xl dark:divide-gray-600 dark:border-gray-600  dark:text-gray-400"
        >
          <div className="cursor-pointer first:rounded-t-md last:rounded-b-md hover:dark:bg-secondaryDark">
            <m.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="flex gap-2 p-2"
            >
              <div className="my-auto">
                <FiActivity />
              </div>
              <div className="truncate">Menu item</div>
            </m.div>
          </div>

          <div className="cursor-pointer first:rounded-t-md last:rounded-b-md hover:dark:bg-secondaryDark">
            <m.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="flex gap-2 p-2"
            >
              <div className="my-auto">
                <FiAperture />
              </div>
              <div className="truncate">Menu item 2</div>
            </m.div>
          </div>

          <div className="cursor-pointer first:rounded-t-md last:rounded-b-md hover:dark:bg-secondaryDark">
            <m.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="flex gap-2 p-2"
            >
              <div className="my-auto">
                <FiTag />
              </div>
              <div className="truncate">
                Menu item 3 with a very long name that should wrap
              </div>
            </m.div>
          </div>
        </div>
      )}
    </div>
  );
};
