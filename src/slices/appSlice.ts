import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export type currentPageName = 'messages' | 'settings';

interface AppState {
  mobileNavOpen: boolean;
  darkMode: boolean;
  currentPage: currentPageName;
}

const initialState: AppState = {
  mobileNavOpen: false,
  darkMode: false,
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
    setDarkModeEnabled(state, action: PayloadAction<boolean>) {
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
  setDarkModeEnabled,
  setCurrentPage,
} = appSlice.actions;

export default appSlice.reducer;
