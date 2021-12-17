import React from 'react';

import { FiBell } from 'react-icons/fi';

import { DeviceStatus } from '@app/components/menu/buttons/DeviceStatus';
import { useAppDispatch, useAppSelector } from '@app/hooks/redux';
import { Connection } from '@components/Connection';
import { MobileNavToggle } from '@components/menu/buttons/MobileNavToggle';
import { Notifications } from '@components/menu/buttons/Notifications';
import { ThemeToggle } from '@components/menu/buttons/ThemeToggle';
import { Logo } from '@components/menu/Logo';
import { MobileNav } from '@components/menu/MobileNav';
import { Navigation } from '@components/menu/Navigation';
import { useRoute } from '@core/router';
import { requestNotificationPermission } from '@core/utils/notifications';
import { Messages } from '@pages/Messages';
import { Nodes } from '@pages/Nodes/Index';
import { NotFound } from '@pages/NotFound';
import { Plugins } from '@pages/Plugins/Index';
import { Settings } from '@pages/settings/Index';

import { addNotification, removeNotification } from './core/slices/appSlice.js';

export const App = (): JSX.Element => {
  const route = useRoute();
  const dispatch = useAppDispatch();
  const notifications = useAppSelector((state) => state.app.notifications);
  const darkMode = useAppSelector((state) => state.app.darkMode);

  React.useEffect(() => {
    if (
      Notification.permission !== 'granted' &&
      notifications.findIndex((n) => n.id === 'notification-permission') === -1
    ) {
      dispatch(
        addNotification({
          id: 'notification-permission',
          icon: <FiBell className="w-4 h-4" />,
          read: Notification.permission === 'denied',
          title: 'Enable Push Notifications',
          action: {
            message: 'Enable',
            action: async () => await requestNotificationPermission(),
          },
        }),
      );
    }

    // Notification.permission === ''
    requestNotificationPermission().catch((e) => {
      console.log(e);
    });
  }, [dispatch, notifications]);

  React.useEffect(() => {
    if (Notification.permission === 'granted') {
      dispatch(removeNotification('notification-permission'));
    }
  }, [dispatch]);

  return (
    <div className={`h-screen w-screen ${darkMode ? 'dark' : ''}`}>
      <Connection />
      <div className="flex flex-col h-full bg-gray-200 dark:bg-primaryDark">
        <div className="flex flex-shrink-0 overflow-hidden bg-primary dark:bg-primary">
          <div className="w-full overflow-hidden bg-white border-b border-gray-300 md:mt-6 md:mx-6 md:py-2 md:rounded-t-3xl dark:border-gray-600 md:shadow-md dark:bg-primaryDark">
            <div className="flex items-center justify-between h-12 px-4 md:px-6">
              <div className="hidden md:flex">
                <Logo />
              </div>
              <Navigation className="hidden md:flex" />
              <MobileNavToggle />
              <div className="flex items-center space-x-2">
                <DeviceStatus />
                <Notifications />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
        <MobileNav />

        <div className="flex flex-grow w-full min-h-0 md:px-6 md:mb-6">
          <div className="flex w-full bg-gray-100 md:shadow-xl md:overflow-hidden dark:bg-secondaryDark md:rounded-b-3xl">
            {route.name === 'messages' && <Messages />}
            {route.name === 'nodes' && <Nodes />}
            {route.name === 'plugins' && <Plugins />}
            {route.name === 'settings' && <Settings />}
            {route.name === false && <NotFound />}
          </div>
        </div>
      </div>
    </div>
  );
};
