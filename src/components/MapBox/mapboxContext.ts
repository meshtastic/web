import React from 'react';

import type mapbox from 'mapbox-gl';

export interface MapboxContextValue {
  ref: React.Ref<HTMLDivElement>;
  map?: mapbox.Map;
}

export const MapboxContext = React.createContext<MapboxContextValue>(
  {} as MapboxContextValue
);
