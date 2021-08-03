import { createSlice } from '@reduxjs/toolkit';

interface AppState {
  sidebarOpen: boolean;
  darkMode: boolean;
}

const initialState: AppState = {
  sidebarOpen: true,
  darkMode: false,
};

export const appSlice = createSlice({
  name: 'app',
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

export default appSlice.reducer;
