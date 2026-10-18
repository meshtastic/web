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
    // Firefox names the permission "local-network"; Chrome also answers to
    // its combined "local-network-access". Browsers without Local Network
    // Access reject both names.
    const query = (name: string) =>
      navigator.permissions.query({ name: name as PermissionName });
    query("local-network")
      .catch(() => query("local-network-access"))
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
