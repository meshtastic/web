import {
  type FlagKey,
  type Flags,
  featureFlags,
} from "@core/services/featureFlags.ts";
import * as React from "react";

export function useFeatureFlags(): Flags {
  return React.useSyncExternalStore(
    (cb) => featureFlags.subscribe(cb),
    () => featureFlags.all(),
    () => featureFlags.all(),
  );
}

export function useFeatureFlag(key: FlagKey): boolean {
  return React.useSyncExternalStore(
    (cb) => featureFlags.subscribe(cb),
    () => featureFlags.get(key),
    () => featureFlags.get(key),
  );
}
