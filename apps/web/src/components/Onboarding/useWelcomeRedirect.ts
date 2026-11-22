import {
  isWelcomeDismissed,
  shouldShowWelcome,
} from "@core/onboarding/welcome.ts";
import { useDeviceStore } from "@core/stores";
import { useEffect, useRef, useSyncExternalStore } from "react";

const subscribeHydration = (onChange: () => void): (() => void) =>
  useDeviceStore.persist.onFinishHydration(onChange);
const hasHydrated = (): boolean => useDeviceStore.persist.hasHydrated();

/** True once the saved connections have loaded from IndexedDB. */
const useDeviceStoreHydrated = (): boolean =>
  useSyncExternalStore(subscribeHydration, hasHydrated, hasHydrated);

/**
 * Sends a first-time visitor to the welcome wizard, once per page load:
 * after the saved connections load, when no radio has ever connected and
 * the wizard wasn't finished or skipped before. `goToWelcome` does the
 * navigation; `onWelcome` skips the check while already there.
 */
export function useWelcomeRedirect(
  goToWelcome: () => void,
  onWelcome: boolean,
): void {
  const hydrated = useDeviceStoreHydrated();
  const decided = useRef(false);
  useEffect(() => {
    if (!hydrated || decided.current) return;
    decided.current = true;
    if (onWelcome) return;
    const { savedConnections, devices } = useDeviceStore.getState();
    const history = {
      savedConnections,
      deviceNodeNums: [...devices.values()].map((d) => d.myNodeNum),
    };
    if (
      shouldShowWelcome(history, {
        hydrated,
        dismissed: isWelcomeDismissed(),
      })
    ) {
      goToWelcome();
    }
  }, [hydrated, onWelcome, goToWelcome]);
}
