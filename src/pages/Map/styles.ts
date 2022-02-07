import type { Style } from 'mapbox-gl';

export type MapStyleName =
  | 'Streets'
  | 'Outdoors'
  | 'Light'
  | 'Dark'
  | 'Satellite';

export interface MapStyle {
  title: MapStyleName;
  data: Style | string;
}

type MapStyleType = {
  [mapStyleType in MapStyleName]: MapStyle;
};

export const MapStyles: MapStyleType = {
  Streets: {
    title: 'Streets',
    data: 'mapbox://styles/mapbox/streets-v11?optimize=true',
  } as MapStyle,
  Outdoors: {
    title: 'Outdoors',
    data: 'mapbox://styles/mapbox/outdoors-v11?optimize=true',
  } as MapStyle,

  Light: {
    title: 'Light',
    data: 'mapbox://styles/mapbox/light-v10?optimize=true',
  } as MapStyle,
  Dark: {
    title: 'Dark',
    data: 'mapbox://styles/sachaw/ckwzwm92e1oep14pjunjqlqbo?optimize=true',
  } as MapStyle,
  Satellite: {
    title: 'Satellite',

    data: {
      version: 8,
      layers: [
        {
          id: 'esri',
          type: 'raster',
          source: 'esri',
        },
      ],
      sources: {
        esri: {
          type: 'raster',
          tiles: [
            'https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          ],
          maxzoom: 17,
        },
      },
    },
  } as MapStyle,
};
