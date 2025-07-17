import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface WindowEventMap {
    "local-storage": CustomEvent<{ key: string }>;
  }
}

type UseLocalStorageOptions<T> = {
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
  initializeWithValue?: boolean;
};

const IS_SERVER = typeof window === "undefined";

export default function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
  options: UseLocalStorageOptions<T> = {},
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const { initializeWithValue = true } = options;

  const serializerRef = useRef(options.serializer ?? JSON.stringify);
  const deserializerRef = useRef(options.deserializer ?? JSON.parse);

  const initialValueRef = useRef<T>(
    typeof initialValue === "function"
      ? (initialValue as () => T)()
      : initialValue,
  );

  const getInitialValue = useCallback(() => initialValueRef.current, []);

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (!initializeWithValue || IS_SERVER) {
      return getInitialValue();
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? deserializerRef.current(item) : getInitialValue();
    } catch (err) {
      console.warn(`Error reading localStorage key “${key}”:`, err);
      return getInitialValue();
    }
  });

  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (value) => {
      if (IS_SERVER) {
        console.warn(
          `Tried setting localStorage key “${key}” in a non-client environment.`,
        );
        return;
      }

      try {
        setStoredValue((prev) => {
          const newValue =
            typeof value === "function"
              ? (value as (prev: T) => T)(prev)
              : value;
          window.localStorage.setItem(key, serializerRef.current(newValue));
          window.dispatchEvent(
            new CustomEvent("local-storage", { detail: { key } }),
          );
          return newValue;
        });
      } catch (err) {
        console.warn(`Error setting localStorage key “${key}”:`, err);
      }
    },
    [key],
  );

  const removeValue = useCallback(() => {
    if (IS_SERVER) {
      console.warn(
        `Tried removing localStorage key “${key}” in a non-client environment.`,
      );
      return;
    }
    try {
      window.localStorage.removeItem(key);
      setStoredValue(getInitialValue());
      window.dispatchEvent(
        new CustomEvent("local-storage", { detail: { key } }),
      );
    } catch (err) {
      console.warn(`Error removing localStorage key “${key}”:`, err);
    }
  }, [key, getInitialValue]);

  useEffect(() => {
    if (IS_SERVER) {
      return;
    }

    const handleStorageChange = (
      event: StorageEvent | CustomEvent<{ key: string }>,
    ) => {
      const eventKey = "key" in event ? event.key : event.detail?.key;

      if (eventKey === key) {
        try {
          const item = window.localStorage.getItem(key);
          setStoredValue(
            item ? deserializerRef.current(item) : getInitialValue(),
          );
        } catch (err) {
          console.warn(`Error syncing localStorage key “${key}”:`, err);
          setStoredValue(getInitialValue());
        }
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
  }, [key, getInitialValue]);

  return [storedValue, setValue, removeValue];
}
