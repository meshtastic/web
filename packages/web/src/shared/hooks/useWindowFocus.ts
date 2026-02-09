import { useSyncExternalStore } from "react";

function subscribe(callback: () => void): () => void {
  document.addEventListener("visibilitychange", callback);
  window.addEventListener("focus", callback);
  window.addEventListener("blur", callback);
  return () => {
    document.removeEventListener("visibilitychange", callback);
    window.removeEventListener("focus", callback);
    window.removeEventListener("blur", callback);
  };
}

function getSnapshot(): boolean {
  return !document.hidden;
}

function getServerSnapshot(): boolean {
  return true;
}

export function useWindowFocus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
