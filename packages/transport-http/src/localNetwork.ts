/**
 * Chrome's Local Network Access (enforced from Chrome 142): once the user
 * allows a site to reach the local network, its requests to local devices
 * are exempt from mixed-content blocking, so an HTTPS page can talk to a
 * radio over plain `http://` without a certificate.
 *
 * Chrome already treats private IP literals and `.local` names as local.
 * `targetAddressSpace: "local"` also covers names that look public but
 * resolve to the LAN. It is only added to `http://` requests from an HTTPS
 * page, the one case where the exemption matters; Chrome rejects such a
 * request if the host turns out to be public. Other browsers ignore it.
 */
export function withLocalNetworkTarget(
  url: string,
  init: RequestInit = {},
): RequestInit {
  if (!url.startsWith("http:") || globalThis.location?.protocol !== "https:") {
    return init;
  }
  return { ...init, targetAddressSpace: "local" } as RequestInit;
}
