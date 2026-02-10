import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import type { ReactiveQueryStatus, SQLocal, StatementInput } from "sqlocal";

export function useReactiveSQL<Result extends Record<string, unknown>>(
  db: SQLocal,
  query: StatementInput<Result>,
): { data: Result[]; status: ReactiveQueryStatus; error: Error | undefined } {
  const [error, setError] = useState<Error | undefined>(undefined);
  const [pending, setPending] = useState(true);

  const reactiveQuery = useMemo(() => {
    setPending(true);
    return db.reactiveQuery(query);
  }, [db, query]);

  const subscribe = useCallback(
    (callback: () => void) => {
      const subscription = reactiveQuery.subscribe(
        () => {
          callback();
          setError(undefined);
          setPending(false);
        },
        (err) => {
          setError(err);
        },
      );
      return () => subscription.unsubscribe();
    },
    [reactiveQuery],
  );

  const getSnapshot = useCallback(() => reactiveQuery.value, [reactiveQuery]);

  const data = useSyncExternalStore(subscribe, getSnapshot) as Result[];
  const status: ReactiveQueryStatus = error
    ? "error"
    : pending
      ? "pending"
      : "ok";

  return { data, status, error };
}
