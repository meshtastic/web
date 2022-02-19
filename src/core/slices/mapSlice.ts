import mapboxgl from 'mapbox-gl';

import type { MapStyleName } from '@pages/Map/styles';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

interface MapState {
  firstLoad: boolean;
  latLng: mapboxgl.LngLat;
  zoom: number;
  bearing: number;
  pitch: number;
  accessToken: string;
  style: MapStyleName;
  hillShade: boolean;
  exaggeration: boolean;
}

const initialState: MapState = {
  firstLoad: true,
  latLng: new mapboxgl.LngLat(0, 0),
  zoom: 2,
  bearing: 0,
  pitch: 0,
  accessToken:
    'pk.eyJ1Ijoic2FjaGF3IiwiYSI6ImNrNW9meXozZjBsdW0zbHBjM2FnNnV6cmsifQ.3E4n8eFGD9ZOFo-XDVeZnQ',
  style: localStorage.getItem('darkModeDisabled') !== 'true' ? 'Dark' : 'Light',
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
    setBearing: (state, action: PayloadAction<number>) => {
      state.bearing = action.payload;
    },
    setPitch: (state, action: PayloadAction<number>) => {
      state.pitch = action.payload;
    },
    setMapStyle(state, action: PayloadAction<MapStyleName>) {
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
  setBearing,
  setPitch,
  setMapStyle,
  setHillShade,
  setExaggeration,
} = mapSlice.actions;

export default mapSlice.reducer;
