import { useDeviceContext } from "@core/hooks/useDeviceContext";
import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import { shallow } from "zustand/shallow";

type GenericEqualityFn<T> = (a: T, b: T) => boolean;

type DebounceOpts<T> = {
  debounce?: number; // 0/undefined = no debounce
  equality?: GenericEqualityFn<T>; // default: shallow
  fireImmediately?: boolean; // default: true
};

type StoreWithSelector<S> = UseBoundStore<StoreApi<S>> & {
  getState(): S;
  subscribe: <U>(
    selector: (state: S) => U,
    listener: (next: U, prev: U) => void,
    options?: { equalityFn?: GenericEqualityFn<U>; fireImmediately?: boolean },
  ) => () => void;
};

export function bindStoreToDevice<S, DB>(
  store: StoreWithSelector<S>,
  resolveDB: (state: S, deviceId: number) => DB,
) {
  // Overloads:
  function useBound(): DB;
  function useBound<T>(selector: (db: DB) => T, opts?: DebounceOpts<T>): T;

  // Implementation:
  function useBound<T>(
    selector?: (db: DB) => T,
    opts?: DebounceOpts<T>,
  ): DB | T {
    const { deviceId } = useDeviceContext();

    // Build the store-level selector
    const storeSelector = useCallback(
      (state: S) => {
        const db = resolveDB(state, deviceId);
        return selector ? selector(db) : db;
      },
      [deviceId, resolveDB, selector],
    );

    type Selected = ReturnType<typeof storeSelector>;

    const wait = opts?.debounce ?? 0;
    const fireImmediately = opts?.fireImmediately ?? true;
    const equality: GenericEqualityFn<Selected> =
      (opts?.equality as GenericEqualityFn<Selected>) ??
      (shallow as unknown as GenericEqualityFn<Selected>);

    const snapRef = useRef<Selected>(storeSelector(store.getState()));
    snapRef.current = storeSelector(store.getState()); // this ensures rerenders with a new selector (new deviceId) see the right initial value

    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
    );

    const subscribe = useMemo(() => {
      return (onChange: () => void) => {
        const unsubscribe = store.subscribe(
          storeSelector,
          (next: Selected, prev: Selected) => {
            const emit = () => {
              snapRef.current = next;
              onChange();
            };

            if (equality(next, prev)) {
              return;
            }
            if (wait > 0) {
              if (timerRef.current) {
                clearTimeout(timerRef.current);
              }
              timerRef.current = setTimeout(emit, wait);
            } else {
              emit();
            }
          },
          { equalityFn: equality, fireImmediately },
        );

        return () => {
          if (timerRef.current) {
            clearTimeout(timerRef.current);
          }
          unsubscribe();
        };
      };
    }, [store, storeSelector, equality, wait, fireImmediately]);

    const getSnapshot = () => snapRef.current;
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  }

  return useBound;
}
