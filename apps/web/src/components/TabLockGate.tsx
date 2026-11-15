import { TabLockOverlay } from "@components/TabLockOverlay.tsx";
import { useTabLock } from "@core/hooks/useTabLock.ts";
import type { TabLock } from "@core/tabLock.ts";
import type { ReactNode } from "react";

export interface TabLockGateProps {
  lock: TabLock;
  children: ReactNode;
}

/** Mounts the app only in the tab that owns the app lock. */
export function TabLockGate({ lock, children }: TabLockGateProps) {
  const { status, takeOver } = useTabLock(lock);

  if (status === "owner") return children;
  if (status === "pending") return null;
  return (
    <TabLockOverlay claiming={status === "claiming"} onUseHere={takeOver} />
  );
}
