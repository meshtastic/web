import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

interface AppState {
  myId: number;
}

const initialState: AppState = {
  myId: 0,
};

export const meshtasticSlice = createSlice({
  name: 'meshtastic',
  initialState,
  reducers: {
    setMyId: (state, action: PayloadAction<number>) => {
      state.myId = action.payload;
    },
  },
});

export const { setMyId } = meshtasticSlice.actions;

export default meshtasticSlice.reducer;
