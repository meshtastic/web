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
