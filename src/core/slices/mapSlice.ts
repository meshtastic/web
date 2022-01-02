import mapboxgl from 'mapbox-gl';

import type { MapStyle } from '@app/components/Map/styles';
import { MapStyles } from '@app/components/Map/styles';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

interface MapState {
  latLng: mapboxgl.LngLat;
  zoom: number;
  accessToken: string;
  style: MapStyle;
  hillShade: boolean;
  exaggeration: boolean;
}

const initialState: MapState = {
  latLng: new mapboxgl.LngLat(-77.0305, 38.8868),
  zoom: 9,
  accessToken:
    'pk.eyJ1Ijoic2FjaGF3IiwiYSI6ImNrNW9meXozZjBsdW0zbHBjM2FnNnV6cmsifQ.3E4n8eFGD9ZOFo-XDVeZnQ',
  style:
    localStorage.getItem('darkMode') === 'true'
      ? MapStyles.Dark
      : MapStyles.Light,
  hillShade: false,
  exaggeration: true,
};

export const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    setLatLng: (state, action: PayloadAction<mapboxgl.LngLat>) => {
      state.latLng = action.payload;
    },
    setZoom: (state, action: PayloadAction<number>) => {
      state.zoom = action.payload;
    },
    setMapStyle(state, action: PayloadAction<MapStyle>) {
      state.style = action.payload;
    },
    setHillShade(state, action: PayloadAction<boolean>) {
      state.hillShade = action.payload;
    },
    setExaggeration(state, action: PayloadAction<boolean>) {
      state.exaggeration = action.payload;
    },
  },
});

export const {
  setLatLng,
  setZoom,
  setMapStyle,
  setHillShade,
  setExaggeration,
} = mapSlice.actions;

export default mapSlice.reducer;
