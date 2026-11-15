import { TabLockOverlay } from "@components/TabLockOverlay.tsx";
import { useTabLock } from "@core/hooks/useTabLock.ts";
import { applyStoredTheme } from "@core/hooks/useTheme.ts";
import type { TabLock } from "@core/tabLock.ts";
import { type ReactNode, useLayoutEffect } from "react";

export interface TabLockGateProps {
  lock: TabLock;
  children: ReactNode;
}

/** Mounts the app only in the tab that owns the app lock. */
export function TabLockGate({ lock, children }: TabLockGateProps) {
  const { status, takeOver } = useTabLock(lock);
  useLayoutEffect(applyStoredTheme, []);

  if (status === "owner") return children;
  return (
    <TabLockOverlay
      claiming={status === "claiming"}
      pending={status === "pending"}
      onUseHere={takeOver}
    />
  );
}
