import type { RunnableQuery } from "drizzle-orm/runnable-query";
import type { StatementInput } from "sqlocal";
import { useMemo } from "react";
import { useReactiveQuery } from "sqlocal/react";
import { dbClient } from "../client.ts";

type QueryStatus = "pending" | "ok" | "error";

/**
 * React hook for reactive Drizzle queries using SQLocal's reactive query system.
 *
 * Automatically subscribes to database changes and re-runs the query when
 * the underlying data changes.
 *
 * @param queryFn - Function that returns a Drizzle query builder
 * @param deps - Dependencies for the query (will re-create query when these change)
 * @returns Object with data, status, error, and isLoading states
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useDrizzleQuery(
 *   () => db.select().from(users).where(eq(users.active, true)),
 *   [activeFilter]
 * );
 * ```
 */
export function useDrizzleQuery<T extends Record<string, unknown>>(
  queryFn: () => RunnableQuery<T[], "sqlite">,
  deps: React.DependencyList = [],
): {
  data: T[];
  status: QueryStatus;
  error: Error | undefined;
  isLoading: boolean;
} {
  // Memoize the query based on deps
  // biome-ignore lint/correctness/useExhaustiveDependencies: deps are passed explicitly
  const query = useMemo(() => queryFn(), deps);

  // Cast is safe: Drizzle's RunnableQuery satisfies SQLocal's StatementInput
  const { data, status, error } = useReactiveQuery<T>(
    dbClient.client,
    query as StatementInput<T>,
  );

  return {
    data,
    status,
    error,
    isLoading: status === "pending" && data.length === 0,
  };
}
