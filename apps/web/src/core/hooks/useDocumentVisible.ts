import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

const isVisible = () => document.visibilityState === "visible";

/** Whether this tab is in the foreground. */
export function useDocumentVisible(): boolean {
  return useSyncExternalStore(subscribe, isVisible);
}
