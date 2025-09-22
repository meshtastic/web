import type { ActionItem } from "@core/stores/";
import { useHeaderStore } from "@core/stores/";
import { useEffect } from "react";

/**
 * Pages call this hook to publish their header title/actions into the App header.
 * On unmount, we reset to avoid stale UI.
 */
export default function usePageHeader(opts: {
  title?: string;
  actions?: ActionItem[];
}) {
  const { setTitle, setActions, reset } = useHeaderStore();

  // biome-ignore lint/correctness/useExhaustiveDependencies: because we want to reset on unmount
  useEffect(() => {
    if (opts.title !== undefined) {
      setTitle(opts.title);
    }
    if (opts.actions !== undefined) {
      setActions(opts.actions);
    }
    return () => reset();
  }, [opts.title, JSON.stringify(opts.actions)]);
}
