import type React from 'react';

import { Connection } from '@components/Connection';
import { BottomNav } from '@components/menu/BottomNav';
import { useRoute } from '@core/router';
import { useAppSelector } from '@hooks/useAppSelector';
import { Extensions } from '@pages/Extensions/Index';
import { MapPage } from '@pages/map';
import { Messages } from '@pages/Messages';
import { NotFound } from '@pages/NotFound';

export const App = (): JSX.Element => {
  const route = useRoute();
  const appState = useAppSelector((state) => state.app);

  return (
    <div className={`h-screen w-screen ${appState.darkMode ? 'dark' : ''}`}>
      <Connection />
      <div className="flex h-full flex-col">
        <div className="flex min-h-0 w-full flex-grow">
          {route.name === 'messages' && <Messages />}
          {route.name === 'map' && <MapPage />}
          {route.name === 'extensions' && <Extensions />}
          {route.name === false && <NotFound />}
        </div>
        <BottomNav />
      </div>
    </div>
  );
};
