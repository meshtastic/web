import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export type currentPageName = 'messages' | 'settings';

interface AppState {
  mobileNavOpen: boolean;
  connectionModalOpen: boolean;
  darkMode: boolean;
  currentPage: currentPageName;
}

const initialState: AppState = {
  mobileNavOpen: false,
  connectionModalOpen: true,
  darkMode: localStorage.getItem('darkMode') === 'true' ?? false,
  currentPage: 'messages',
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    openMobileNav(state) {
      state.mobileNavOpen = true;
    },
    closeMobileNav(state) {
      state.mobileNavOpen = false;
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
  },
});

export const {
  openMobileNav,
  closeMobileNav,
  openConnectionModal,
  closeConnectionModal,
  setDarkModeEnabled,
  setCurrentPage,
} = appSlice.actions;

export default appSlice.reducer;
