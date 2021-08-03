import { createSlice } from '@reduxjs/toolkit';

import type { RootState } from '../store';

interface AppState {
  sidebarOpen: boolean;
  darkMode: boolean;
}

const initialState: AppState = {
  sidebarOpen: true,
  darkMode: false,
};

export const appSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    openSidebar(state) {
      state.sidebarOpen = true;
    },
    closeSidebar(state) {
      state.sidebarOpen = false;
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
  },
});

export const { openSidebar, closeSidebar, toggleSidebar } = appSlice.actions;
export const selectOpenState = (state: RootState): boolean =>
  state.app.sidebarOpen;
export default appSlice.reducer;
