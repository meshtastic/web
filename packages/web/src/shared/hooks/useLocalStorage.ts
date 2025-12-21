/**
 * useLocalStorage - React 19 hook using useSyncExternalStore
 *
 * Provides tear-free localStorage synchronization across tabs and
 * within the same tab using the storage event and custom local-storage event.
 */

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useRef, useSyncExternalStore } from "react";

declare global {
  interface WindowEventMap {
    "local-storage": CustomEvent<{ key: string }>;
  }
}

type UseLocalStorageOptions<T> = {
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
};

function createLocalStorageStore<T>(
  key: string,
  initialValue: T,
  serializer: (value: T) => string,
  deserializer: (value: string) => T,
) {
  const getSnapshot = (): T => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? deserializer(item) : initialValue;
    } catch {
      return initialValue;
    }
  };

  const subscribe = (onStoreChange: () => void): (() => void) => {
    const handleStorageChange = (
      event: StorageEvent | CustomEvent<{ key: string }>,
    ) => {
      const eventKey = "key" in event ? event.key : event.detail?.key;
      if (eventKey === key) {
        onStoreChange();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(
      "local-storage",
      handleStorageChange as EventListener,
    );

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "local-storage",
        handleStorageChange as EventListener,
      );
    };
  };

  const setValue = (value: T | ((prev: T) => T)): void => {
    try {
      const currentValue = getSnapshot();
      const newValue =
        typeof value === "function"
          ? (value as (prev: T) => T)(currentValue)
          : value;
      window.localStorage.setItem(key, serializer(newValue));
      window.dispatchEvent(
        new CustomEvent("local-storage", { detail: { key } }),
      );
    } catch (err) {
      console.warn(`Error setting localStorage key "${key}":`, err);
    }
  };

  const removeValue = (): void => {
    try {
      window.localStorage.removeItem(key);
      window.dispatchEvent(
        new CustomEvent("local-storage", { detail: { key } }),
      );
    } catch (err) {
      console.warn(`Error removing localStorage key "${key}":`, err);
    }
  };

  return { getSnapshot, subscribe, setValue, removeValue };
}

// ==================== Hook ====================

export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
  options: UseLocalStorageOptions<T> = {},
): [T, Dispatch<SetStateAction<T>>, () => void] {
  // Resolve initial value once
  const initialValueRef = useRef<T | null>(null);
  if (initialValueRef.current === null) {
    initialValueRef.current =
      typeof initialValue === "function"
        ? (initialValue as () => T)()
        : initialValue;
  }

  const serializerRef = useRef(options.serializer ?? JSON.stringify);
  const deserializerRef = useRef(options.deserializer ?? JSON.parse);

  // Create store for this key (stable across renders)
  const storeRef = useRef<ReturnType<typeof createLocalStorageStore<T>> | null>(
    null,
  );
  if (storeRef.current === null) {
    storeRef.current = createLocalStorageStore(
      key,
      initialValueRef.current,
      serializerRef.current,
      deserializerRef.current,
    );
  }

  const store = storeRef.current;

  // Subscribe to localStorage changes
  const value = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot, // Same for server snapshot in SPA
  );

  // Stable setter callback
  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (newValue) => store.setValue(newValue),
    [store],
  );

  // Stable remove callback
  const removeValue = useCallback(() => store.removeValue(), [store]);

  return [value, setValue, removeValue];
}
