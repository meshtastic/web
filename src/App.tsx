import React from 'react';

import { ErrorBoundary } from 'react-error-boundary';
import { FiBell } from 'react-icons/fi';

import { Connection } from '@components/Connection';
import { Logo } from '@components/menu/Logo';
import { Navigation } from '@components/menu/Navigation';
import { useRoute } from '@core/router';
import { requestNotificationPermission } from '@core/utils/notifications';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { useAppSelector } from '@hooks/useAppSelector';
import { Messages } from '@pages/Messages';
import { Nodes } from '@pages/Nodes';
import { NotFound } from '@pages/NotFound';
import { Settings } from '@pages/settings/Index';

import { ErrorFallback } from './components/ErrorFallback';
import { MapboxProvider } from './components/MapBox/MapboxProvider';
import { BottomNav } from './components/menu/BottomNav';
import { addNotification, removeNotification } from './core/slices/appSlice';

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
      <div className="flex flex-col h-full bg-gray-200 dark:bg-secondaryDark">
        <div className="flex flex-shrink-0 overflow-hidden bg-primary dark:bg-primary">
          <div className="w-full overflow-hidden bg-white border-b border-gray-300 dark:border-gray-600 md:shadow-md dark:bg-secondaryDark">
            <div className="flex items-center justify-between h-12 px-4">
              <div className="flex">
                <Logo />
              </div>
              <Navigation />
            </div>
          </div>
        </div>

        <div className="flex flex-grow w-full min-h-0">
          <div className="flex w-full bg-gray-100 md:shadow-xl md:overflow-hidden dark:bg-secondaryDark">
            <ErrorBoundary FallbackComponent={ErrorFallback}>
              {route.name === 'messages' && <Messages />}
              {route.name === 'nodes' && (
                <MapboxProvider>
                  <Nodes />
                </MapboxProvider>
              )}
              {route.name === 'settings' && <Settings />}
              {route.name === false && <NotFound />}
            </ErrorBoundary>
          </div>
        </div>
        <BottomNav />
      </div>
    </div>
  );
};
