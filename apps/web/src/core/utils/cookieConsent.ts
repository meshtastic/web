/**
 * The CookieYes banner is only added to production builds that have a client
 * ID (see vite.config.ts). Its own floating "revisit consent" button is
 * hidden in index.css, so the app offers the same action itself.
 */
declare global {
  interface Window {
    /** Set by the CookieYes banner script; reopens its preference centre. */
    revisitCkyConsent?: () => void;
  }
}

export const cookieConsentEnabled =
  import.meta.env.PROD && Boolean(import.meta.env.VITE_COOKIEYES_CLIENT_ID);

/** Opens the CookieYes preference centre, once its script has loaded. */
export function openCookieConsent(): void {
  globalThis.window?.revisitCkyConsent?.();
}
