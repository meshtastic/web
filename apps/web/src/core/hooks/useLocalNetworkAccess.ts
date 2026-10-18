import { useEffect, useState } from "react";

/**
 * State of Chrome's Local Network Access permission for this site.
 * `unsupported` covers browsers without it (Safari, Firefox) and insecure
 * pages; `unknown` is the state until the browser answers.
 */
export type LocalNetworkAccess =
  | "unknown"
  | "unsupported"
  | "granted"
  | "prompt"
  | "denied";

export function useLocalNetworkAccess(): LocalNetworkAccess {
  const [state, setState] = useState<LocalNetworkAccess>("unknown");

  useEffect(() => {
    let status: PermissionStatus | undefined;
    let cancelled = false;
    const update = () => {
      if (!cancelled && status) {
        setState(status.state as LocalNetworkAccess);
      }
    };

    if (!globalThis.isSecureContext || !navigator.permissions?.query) {
      setState("unsupported");
      return;
    }
    // Browsers without Local Network Access reject the unknown name.
    navigator.permissions
      .query({ name: "local-network-access" as PermissionName })
      .then((result) => {
        status = result;
        update();
        status.addEventListener("change", update);
      })
      .catch(() => {
        if (!cancelled) setState("unsupported");
      });

    return () => {
      cancelled = true;
      status?.removeEventListener("change", update);
    };
  }, []);

  return state;
}
