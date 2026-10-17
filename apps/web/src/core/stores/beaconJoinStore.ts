import type { BeaconJoinPlan } from "@core/utils/beaconJoin.ts";
import { create } from "zustand";

/**
 * Session state for Mesh Beacon offers: the join waiting in the channel
 * import dialog, and the offers already notified or dismissed. Keys come
 * from beaconOfferKey, so an identical rebroadcast stays quiet.
 */
interface BeaconJoinState {
  pending: BeaconJoinPlan | undefined;
  notified: ReadonlySet<string>;
  dismissed: ReadonlySet<string>;
  startJoin: (plan: BeaconJoinPlan) => void;
  clearJoin: () => void;
  markNotified: (key: string) => void;
  markDismissed: (key: string) => void;
}

export const useBeaconJoinStore = create<BeaconJoinState>()((set) => ({
  pending: undefined,
  notified: new Set(),
  dismissed: new Set(),
  startJoin: (plan) => set({ pending: plan }),
  clearJoin: () => set({ pending: undefined }),
  markNotified: (key) =>
    set((s) => ({ notified: new Set(s.notified).add(key) })),
  markDismissed: (key) =>
    set((s) => ({ dismissed: new Set(s.dismissed).add(key) })),
}));
