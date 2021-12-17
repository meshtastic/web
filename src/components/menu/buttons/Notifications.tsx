import React from 'react';

import { FiBell, FiX } from 'react-icons/fi';

import { useAppSelector } from '@app/hooks/redux';
import { Button } from '@components/generic/Button';
import { IconButton } from '@components/generic/IconButton';
import { shift, useFloating } from '@floating-ui/react-dom';
import { Popover } from '@headlessui/react';

export const Notifications = (): JSX.Element => {
  const [unreadCount, setUnreadCount] = React.useState(0);
  const notifications = useAppSelector((state) => state.app.notifications);

  const { x, y, reference, floating, strategy } = useFloating({
    placement: 'bottom',
    middleware: [shift()],
  });

  React.useEffect(() => {
    setUnreadCount(
      notifications.filter((notification) => !notification.read).length,
    );
  }, [notifications]);

  return (
    <Popover>
      <Popover.Button as="div" className="relative" ref={reference}>
        <IconButton icon={<FiBell className="w-5 h-5" />} />
        {unreadCount > 0 && (
          <div className="absolute pointer-events-none top-1 right-1">
            <div className="w-3 h-3 text-xs font-semibold leading-3 text-center text-white bg-orange-500 rounded-full">
              {unreadCount}
            </div>
          </div>
        )}
      </Popover.Button>

      <Popover.Panel
        ref={floating}
        style={{
          position: strategy,
          top: y ?? '',
          left: x ?? '',
        }}
        className="fixed z-50 border border-gray-300 rounded-md shadow-md w-72 bg-primaryDark dark:border-gray-600"
      >
        <div className="divide-y divide-gray-600">
          {notifications.map((notification, index) => (
            <div
              key={index}
              className={`p-1 flex text-sm justify-between ${
                notification.read
                  ? 'text-gray-600 dark:text-gray-300'
                  : 'text-gray-900 dark:text-white'
              }`}
            >
              <div className="my-auto">{notification.icon}</div>

              <div className="my-auto font-light">{notification.title}</div>

              <div className="flex space-x-1">
                {notification.action ? (
                  <div className="my-auto w-18">
                    <Button
                      border
                      padding="0.5"
                      onClick={notification.action.action}
                    >
                      {notification.action.message}
                    </Button>
                  </div>
                ) : (
                  <div className="w-16" />
                )}
                <IconButton icon={<FiX />} />
              </div>
            </div>
          ))}
        </div>
      </Popover.Panel>
    </Popover>
  );
};
