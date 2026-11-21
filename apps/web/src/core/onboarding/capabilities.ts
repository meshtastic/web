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

/** The browser families the connect step can name when a transport is missing. */
export type BrowserFamily =
  | "firefox"
  | "safari"
  | "ios"
  | "samsung"
  | "brave"
  | "edge"
  | "opera"
  | "chrome"
  | "unknown";

export interface BrowserEnvironment {
  readonly browser: BrowserFamily;
  /** Web Bluetooth and Web Serial only exist on HTTPS pages and localhost. */
  readonly secureContext: boolean;
}

const UNKNOWN_ENVIRONMENT: BrowserEnvironment = {
  browser: "unknown",
  secureContext: true,
};

export type DeviceTransport = "bluetooth" | "serial";

/**
 * Why a transport can't be offered. Both reasons come from feature
 * detection, so naming the browser never claims more than what was observed:
 * the API is missing here.
 */
export type UnavailableReason =
  | { readonly kind: "insecureContext" }
  | { readonly kind: "notSupported"; readonly browser: BrowserFamily };

export interface TransportSupport {
  readonly available: Readonly<Record<ConnectMethod, boolean>>;
  /** Set for each device transport the browser can't offer. */
  readonly unavailable: Readonly<
    Partial<Record<DeviceTransport, UnavailableReason>>
  >;
  /** Neither Bluetooth nor USB: the connect step shows the HTTP-only banner. */
  readonly httpOnly: boolean;
  /** The first available method, in the order the options are listed. */
  readonly defaultMethod: ConnectMethod;
}

export function unavailableReason(
  present: boolean,
  env: BrowserEnvironment,
): UnavailableReason | undefined {
  if (present) {
    return undefined;
  }
  return env.secureContext
    ? { kind: "notSupported", browser: env.browser }
    : { kind: "insecureContext" };
}

export function transportSupport(
  flags: BrowserFeatureFlags,
  env: BrowserEnvironment = UNKNOWN_ENVIRONMENT,
): TransportSupport {
  const available: Record<ConnectMethod, boolean> = {
    bluetooth: flags.bluetooth,
    serial: flags.serial,
    http: true,
  };
  const unavailable: Partial<Record<DeviceTransport, UnavailableReason>> = {};
  const bluetooth = unavailableReason(flags.bluetooth, env);
  if (bluetooth) {
    unavailable.bluetooth = bluetooth;
  }
  const serial = unavailableReason(flags.serial, env);
  if (serial) {
    unavailable.serial = serial;
  }
  return {
    available,
    unavailable,
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
 * Names the browser from its user agent. Brave reports a Chrome user agent
 * but exposes `navigator.brave`; every iPhone and iPad browser runs WebKit,
 * so they share one family whatever their name.
 */
export function browserFamily(
  userAgent: string,
  isBrave = false,
): BrowserFamily {
  if (/iPhone|iPad|iPod|CriOS\/|FxiOS\/|EdgiOS\//.test(userAgent)) {
    return "ios";
  }
  if (isBrave) {
    return "brave";
  }
  if (/Firefox\/|FxiOS\//.test(userAgent)) {
    return "firefox";
  }
  if (/SamsungBrowser\//.test(userAgent)) {
    return "samsung";
  }
  if (/Edg\//.test(userAgent)) {
    return "edge";
  }
  if (/OPR\//.test(userAgent)) {
    return "opera";
  }
  if (/Chrome\/|Chromium\//.test(userAgent)) {
    return "chrome";
  }
  if (/Safari\//.test(userAgent)) {
    return "safari";
  }
  return "unknown";
}

export function detectBrowserEnvironment(
  nav: Navigator | undefined = globalThis.navigator,
  secureContext: boolean = globalThis.isSecureContext ?? true,
): BrowserEnvironment {
  if (nav === undefined) {
    return UNKNOWN_ENVIRONMENT;
  }
  return {
    browser: browserFamily(nav.userAgent, "brave" in nav),
    secureContext,
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
