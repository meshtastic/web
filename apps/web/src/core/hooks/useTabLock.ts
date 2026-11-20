import type { TabLock, TabLockStatus } from "@core/tabLock.ts";
import { useSyncExternalStore } from "react";

export function useTabLock(lock: TabLock): {
  status: TabLockStatus;
  takeOver: () => void;
} {
  const status = useSyncExternalStore(lock.subscribe, lock.getStatus);
  return { status, takeOver: lock.takeOver };
}
