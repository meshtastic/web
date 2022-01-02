import { configureStore } from '@reduxjs/toolkit';

import appReducer from './slices/appSlice';
import mapReducer from './slices/mapSlice';
import meshtasticReducer from './slices/meshtasticSlice';

export const store = configureStore({
  reducer: {
    app: appReducer,
    meshtastic: meshtasticReducer,
    map: mapReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
