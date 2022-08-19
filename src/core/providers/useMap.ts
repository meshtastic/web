import { createContext, useContext } from "react";

import type { Map } from "maplibre-gl";

export interface MapContextValue {
  ref: React.Ref<HTMLDivElement>;
  map?: Map;
}

export const MapContext = createContext<MapContextValue>({} as MapContextValue);

export const useMap = (): MapContextValue => {
  return useContext(MapContext);
};
