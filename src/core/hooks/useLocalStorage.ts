// taken from https://react-hooked.vercel.app/docs/useLocalStorage/

import { useCallback, useEffect, useState } from "react";

import type { Dispatch, SetStateAction } from "react";

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface WindowEventMap {
    "local-storage": CustomEvent;
  }
}

type UseLocalStorageOptions<T> = {
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
  initializeWithValue?: boolean;
};

const IS_SERVER = typeof window === "undefined";

/**
 * Hook for persisting state to localStorage.
 *
 * @param {string} key - The key to use for localStorage.
 * @param {T | (() => T)} initialValue - The initial value to use, if not found in localStorage.
 * @param {UseLocalStorageOptions<T>} options - Options for the hook.
 * @returns A tuple of [storedValue, setValue, removeValue].
 */
export default function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
  options: UseLocalStorageOptions<T> = {},
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const { initializeWithValue = true } = options;

  const serializer = useCallback<(value: T) => string>(
    (value) => {
      if (options.serializer) {
        return options.serializer(value);
      }

      return JSON.stringify(value);
    },
    [options],
  );

  const deserializer = useCallback<(value: string) => T>(
    (value) => {
      if (options.deserializer) {
        return options.deserializer(value);
      }
      // Support 'undefined' as a value
      if (value === "undefined") {
        return undefined as unknown as T;
      }

      const defaultValue = initialValue instanceof Function
        ? initialValue()
        : initialValue;

      let parsed: unknown;
      try {
        parsed = JSON.parse(value);
      } catch (error) {
        console.error("Error parsing JSON:", error);
        return defaultValue; // Return initialValue if parsing fails
      }

      return parsed as T;
    },
    [options, initialValue],
  );

  // Get from local storage then
  // parse stored json or return initialValue
  const readValue = useCallback((): T => {
    const initialValueToUse = initialValue instanceof Function
      ? initialValue()
      : initialValue;

    // Prevent build error "window is undefined" but keep working
    if (IS_SERVER) {
      return initialValueToUse;
    }

    try {
      const raw = globalThis.localStorage.getItem(key);
      return raw ? deserializer(raw) : initialValueToUse;
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}”:`, error);
      return initialValueToUse;
    }
  }, [initialValue, key, deserializer]);

  const [storedValue, setStoredValue] = useState(() => {
    if (initializeWithValue) {
      return readValue();
    }

    return initialValue instanceof Function ? initialValue() : initialValue;
  });

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (value) => {
      // Prevent build error "window is undefined" but keeps working
      if (IS_SERVER) {
        console.warn(
          `Tried setting localStorage key “${key}” even though environment is not a client`,
        );
      }

      try {
        // Allow value to be a function so we have the same API as useState
        const newValue = value instanceof Function ? value(readValue()) : value;

        // Save to local storage
        globalThis.localStorage.setItem(key, serializer(newValue));

        // Save state
        setStoredValue(newValue);

        // We dispatch a custom event so every similar useLocalStorage hook is notified
        globalThis.dispatchEvent(new StorageEvent("local-storage", { key }));
      } catch (error) {
        console.warn(`Error setting localStorage key “${key}”:`, error);
      }
    },
    [key, serializer, readValue],
  );

  const removeValue = useCallback(() => {
    // Prevent build error "window is undefined" but keeps working
    if (IS_SERVER) {
      console.warn(
        `Tried removing localStorage key “${key}” even though environment is not a client`,
      );
    }

    const defaultValue = initialValue instanceof Function
      ? initialValue()
      : initialValue;

    // Remove the key from local storage
    globalThis.localStorage.removeItem(key);

    // Save state with default value
    setStoredValue(defaultValue);

    // We dispatch a custom event so every similar useLocalStorage hook is notified
    globalThis.dispatchEvent(new StorageEvent("local-storage", { key }));
  }, [key]);

  useEffect(() => {
    setStoredValue(readValue());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const handleStorageChange = useCallback(
    (event: StorageEvent | CustomEvent) => {
      if ((event as StorageEvent).key && (event as StorageEvent).key !== key) {
        return;
      }
      setStoredValue(readValue());
    },
    [key, readValue],
  );

  useEffect(() => {
    addEventListener("storage", handleStorageChange);
    // this is a custom event, triggered in writeValueToLocalStorage
    addEventListener("local-storage", handleStorageChange);
    return () => {
      removeEventListener("storage", handleStorageChange);
      removeEventListener("local-storage", handleStorageChange);
    };
  }, []);

  return [storedValue, setValue, removeValue];
}
