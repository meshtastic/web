import type { LocalNetworkAccess } from "@core/hooks/useLocalNetworkAccess.ts";

/**
 * Which ways of reaching a radio this browser offers. Web Bluetooth and Web
 * Serial exist only in Chromium browsers on secure pages; HTTP works
 * everywhere.
 */

export const CONNECT_METHODS = ["bluetooth", "serial", "http"] as const;

export type ConnectMethod = (typeof CONNECT_METHODS)[number];

export interface BrowserFeatureFlags {
  readonly bluetooth: boolean;
  readonly serial: boolean;
}

export interface TransportSupport {
  readonly available: Readonly<Record<ConnectMethod, boolean>>;
  /** Neither Bluetooth nor USB: the connect step shows the HTTP-only banner. */
  readonly httpOnly: boolean;
  /** The first available method, in the order the options are listed. */
  readonly defaultMethod: ConnectMethod;
}

export function transportSupport(flags: BrowserFeatureFlags): TransportSupport {
  const available: Record<ConnectMethod, boolean> = {
    bluetooth: flags.bluetooth,
    serial: flags.serial,
    http: true,
  };
  return {
    available,
    httpOnly: !flags.bluetooth && !flags.serial,
    defaultMethod:
      CONNECT_METHODS.find((method) => available[method]) ?? "http",
  };
}

export const isMethodAvailable = (
  support: TransportSupport,
  method: ConnectMethod,
): boolean => support.available[method];

/** Reads the feature flags without casts: `in` narrows `navigator`. */
export function detectBrowserFeatures(
  nav: Navigator | undefined = globalThis.navigator,
): BrowserFeatureFlags {
  if (nav === undefined) {
    return { bluetooth: false, serial: false };
  }
  return {
    bluetooth: "bluetooth" in nav && nav.bluetooth !== undefined,
    serial: "serial" in nav && nav.serial !== undefined,
  };
}

/**
 * On an HTTPS page, plain HTTP to a radio is mixed content unless the
 * browser supports Chrome's Local Network Access, so HTTPS is forced until
 * the browser confirms that support.
 */
export const isHttpsRequired = (
  pageIsHttps: boolean,
  localNetworkAccess: LocalNetworkAccess,
): boolean =>
  pageIsHttps &&
  (localNetworkAccess === "unsupported" || localNetworkAccess === "unknown");
