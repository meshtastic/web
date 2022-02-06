import type { Types } from '@meshtastic/meshtasticjs';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export type currentPageName = 'messages' | 'settings';

export enum connType {
  HTTP,
  BLE,
  SERIAL,
}

interface AppState {
  mobileNavOpen: boolean;
  navCollapsed: boolean;
  connectionModalOpen: boolean;
  darkMode: boolean;
  currentPage: currentPageName;
  connType: connType;
  connectionParams: {
    BLE: Types.BLEConnectionParameters;
    HTTP: Types.HTTPConnectionParameters;
    SERIAL: Types.SerialConnectionParameters;
  };
}

const initialState: AppState = {
  mobileNavOpen: false,
  navCollapsed: false,
  connectionModalOpen: true,
  darkMode: localStorage.getItem('darkMode') === 'true' ?? false,
  currentPage: 'messages',
  connType: connType.HTTP,
  connectionParams: {
    BLE: {},
    HTTP: {
      address: 'http://meshtastic.local/',
      tls: false,
      receiveBatchRequests: false,
      fetchInterval: 2000,
    },
    SERIAL: {},
  },
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    toggleMobileNav(state) {
      state.mobileNavOpen = !state.mobileNavOpen;
    },
    openConnectionModal(state) {
      state.connectionModalOpen = true;
    },
    closeConnectionModal(state) {
      state.connectionModalOpen = false;
    },
    setDarkModeEnabled(state, action: PayloadAction<boolean>) {
      localStorage.setItem('darkMode', String(action.payload));
      state.darkMode = action.payload;
    },
    setCurrentPage(state, action: PayloadAction<currentPageName>) {
      state.currentPage = action.payload;
    },
    setConnType(state, action: PayloadAction<connType>) {
      state.connType = action.payload;
    },
    setConnectionParams(
      state,
      action: PayloadAction<{
        type: connType;
        params: Types.ConnectionParameters;
      }>,
    ) {
      // @ts-ignore tmp
      state.connectionParams[connType[action.payload.type]] =
        action.payload.params;
    },
  },
});

export const {
  toggleMobileNav,
  openConnectionModal,
  closeConnectionModal,
  setDarkModeEnabled,
  setCurrentPage,
  setConnType,
  setConnectionParams,
} = appSlice.actions;

export default appSlice.reducer;
