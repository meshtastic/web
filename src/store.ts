import type { Protobuf } from '@meshtastic/meshtasticjs';
import { configureStore, createSlice } from '@reduxjs/toolkit';

const nodesSlice = createSlice({
  name: 'nodes',
  initialState: {
    members: [],
  },
  reducers: {
    addMember: (state: Protobuf.NodeInfo[], node: Protobuf.NodeInfo) => {
      // Redux Toolkit allows us to write "mutating" logic in reducers. It
      // doesn't actually mutate the state because it uses the Immer library,
      // which detects changes to a "draft state" and produces a brand new
      // immutable state based off those changes
      state.push(node);
    },
  },
});

export default configureStore({
  reducer: {
    nodes: nodesSlice.reducer,
  },
});
