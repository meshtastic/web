export interface MapStyle {
  title: string;
  url: string;
}

export const MapStyles = {
  Streets: {
    title: 'Streets',
    url: 'mapbox://styles/mapbox/streets-v11',
  } as MapStyle,
  Outdoors: {
    title: 'Outdoors',
    url: 'mapbox://styles/mapbox/outdoors-v11',
  } as MapStyle,

  Light: {
    title: 'Light',
    url: 'mapbox://styles/mapbox/light-v10',
  } as MapStyle,
  Dark: { title: 'Dark', url: 'mapbox://styles/mapbox/dark-v10' } as MapStyle,
  Satellite: {
    title: 'Satellite',
    url: 'mapbox://styles/mapbox/satellite-v9',
  } as MapStyle,
};
