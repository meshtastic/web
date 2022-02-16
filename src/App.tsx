import React from 'react';

import { Map } from '@app/pages/Map';
import { Connection } from '@components/Connection';
import { useRoute } from '@core/router';
import { useAppSelector } from '@hooks/useAppSelector';

import { ContextMenu } from './components/generic/ContextMenu';
import { BottomNav } from './components/menu/BottomNav';
import { Extensions } from './pages/Extensions/Index';
import { Messages } from './pages/Messages';
import { Nodes } from './pages/Nodes';
import { NotFound } from './pages/NotFound';

export const App = (): JSX.Element => {
  const route = useRoute();
  const darkMode = useAppSelector((state) => state.app.darkMode);

  return (
    <div className={`h-screen w-screen ${darkMode ? 'dark' : ''}`}>
      <ContextMenu>
        <Connection />
        <div className="flex h-full flex-col bg-gray-200 dark:bg-secondaryDark">
          <div className="flex min-h-0 w-full flex-grow">
            {route.name === 'messages' && <Messages />}
            {route.name === 'nodes' && <Nodes />}
            {route.name === 'map' && <Map />}
            {route.name === 'extensions' && <Extensions />}
            {route.name === false && <NotFound />}
          </div>
          <BottomNav />
        </div>
      </ContextMenu>
    </div>
  );
};
