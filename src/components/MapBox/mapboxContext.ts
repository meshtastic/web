import type React from 'react';
import { createContext } from 'react';

import type { Map } from 'mapbox-gl';

export interface MapboxContextValue {
  ref: React.Ref<HTMLDivElement>;
  map?: Map;
}

export const MapboxContext = createContext<MapboxContextValue>(
  {} as MapboxContextValue,
);
