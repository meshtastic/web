import appReducer from '@core/slices/appSlice';
import mapReducer from '@core/slices/mapSlice';
import meshtasticReducer from '@core/slices/meshtasticSlice';
import { configureStore } from '@reduxjs/toolkit';

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
