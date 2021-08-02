import { configureStore } from '@reduxjs/toolkit';

import appSlice from './slices/appSlice';
import meshtasticSlice from './slices/meshtasticSlice';

export const store = configureStore({
  reducer: {
    app: appSlice,
    meshtastic: meshtasticSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
