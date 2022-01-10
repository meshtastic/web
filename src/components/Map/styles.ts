export interface MapStyle {
  title: string;
  url: string;
}

export const MapStyles = {
  Streets: {
    title: 'Streets',
    url: 'mapbox://styles/mapbox/streets-v11?optimize=true',
  } as MapStyle,
  Outdoors: {
    title: 'Outdoors',
    url: 'mapbox://styles/mapbox/outdoors-v11?optimize=true',
  } as MapStyle,

  Light: {
    title: 'Light',
    url: 'mapbox://styles/mapbox/light-v10?optimize=true',
  } as MapStyle,
  Dark: {
    title: 'Dark',
    url: 'mapbox://styles/sachaw/ckwzwm92e1oep14pjunjqlqbo?optimize=true',
  } as MapStyle,
  Satellite: {
    title: 'Satellite',
    url: 'mapbox://styles/mapbox/satellite-v9?optimize=true',
  } as MapStyle,
};
