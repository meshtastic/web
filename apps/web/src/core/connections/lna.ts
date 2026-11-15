interface LocalNetworkRequestInit extends RequestInit {
  targetAddressSpace?: "local" | "private" | "public";
}

/**
 * Marks a plain-HTTP request from an HTTPS page as targeting the local
 * network, so Chrome's Local Network Access gate lets it through once the
 * user has granted the permission. Loopback is its own address space and
 * already trusted, so it needs no annotation.
 */
export function withLocalNetworkTarget(
  url: string,
  init: RequestInit = {},
): LocalNetworkRequestInit {
  if (!url.startsWith("http:") || globalThis.location?.protocol !== "https:") {
    return init;
  }
  if (isLoopback(url)) return init;
  return { ...init, targetAddressSpace: "local" };
}

/** True for a plain-HTTP local target from an HTTPS page, which Chrome gates behind Local Network Access. */
export function needsLocalNetworkAccess(url: string): boolean {
  return (
    url.startsWith("http:") &&
    globalThis.location?.protocol === "https:" &&
    !isLoopback(url)
  );
}

export type LocalNetworkPermission =
  | "granted"
  | "denied"
  | "prompt"
  | "unsupported";

/**
 * The page's Local Network Access permission, by the current name and the
 * alias Chromium still accepts, or `unsupported` where the API is absent.
 */
export async function queryLocalNetworkAccess(): Promise<LocalNetworkPermission> {
  const permissions: PermissionsByName | undefined =
    globalThis.navigator?.permissions;
  if (!globalThis.isSecureContext || !permissions) return "unsupported";
  for (const name of ["local-network", "local-network-access"]) {
    try {
      const { state } = await permissions.query({ name });
      return state;
    } catch {}
  }
  return "unsupported";
}

/** `Permissions.query` for names newer than the DOM lib's `PermissionName`. */
interface PermissionsByName {
  query(descriptor: { name: string }): Promise<PermissionStatus>;
}

function isLoopback(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "[::1]" ||
    /^127\.\d+\.\d+\.\d+$/.test(host)
  );
}
