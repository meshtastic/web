import { useCallback, useSyncExternalStore } from "react";

const MOBILE_QUERY = "not all and (min-width: 48rem)";

/**
 * Wide enough for the rail, the ~300px sidebar, a usable conversation and
 * the 320px details column side by side (Tailwind `lg`). Narrower desktop
 * layouts (tablets) open the details panel as a drawer instead.
 */
export const DETAILS_COLUMN_QUERY = "(min-width: 64rem)";

/**
 * Room for labelled header actions beside the sidebar and details column
 * (Tailwind `xl`); narrower layouts fold them into the overflow menu.
 */
export const LABELLED_ACTIONS_QUERY = "(min-width: 80rem)";

/** Follows a CSS media query across viewport changes. */
export function useMediaQuery(mediaQuery: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const query = globalThis.matchMedia(mediaQuery);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    [mediaQuery],
  );
  return useSyncExternalStore(
    subscribe,
    () => globalThis.matchMedia(mediaQuery).matches,
  );
}

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}

/** Whether labelled header actions fit beside the side columns. */
export function useFitsLabelledActions(): boolean {
  return useMediaQuery(LABELLED_ACTIONS_QUERY);
}

/** Whether the details panel fits as a column beside the conversation. */
export function useCanFitDetailsColumn(): boolean {
  return useMediaQuery(DETAILS_COLUMN_QUERY);
}
