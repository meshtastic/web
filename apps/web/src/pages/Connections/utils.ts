import type {
  Connection,
  ConnectionStatus,
  ConnectionType,
  NewConnection,
} from "@app/core/stores/deviceStore/types";
import { randId } from "@app/core/utils/randId";
import { t } from "i18next";
import { Bluetooth, Cable, Globe, type LucideIcon } from "lucide-react";

export function createConnectionFromInput(input: NewConnection): Connection {
  const base = {
    id: randId(),
    name: input.name,
    createdAt: Date.now(),
    status: "disconnected" as ConnectionStatus,
  };
  if (input.type === "http") {
    return {
      ...base,
      type: "http",
      url: input.url,
      isDefault: false,
      name: input.name.length === 0 ? input.url : input.name,
    };
  }
  if (input.type === "bluetooth") {
    return {
      ...base,
      type: "bluetooth",
      deviceId: input.deviceId,
      deviceName: input.deviceName,
      gattServiceUUID: input.gattServiceUUID,
    };
  }
  return {
    ...base,
    type: "serial",
    usbVendorId: input.usbVendorId,
    usbProductId: input.usbProductId,
  };
}

// Cert rejection requires a TCP connection + TLS handshake before the browser rejects,
// so it takes at least ~20ms on a LAN. Failures faster than that are port-closed or
// ICMP-unreachable (no TLS ever attempted). ARP timeouts for phantom IPs on the same
// subnet take ~1-3s, so failures slower than 2000ms (but before the AbortController
// fires) are that — not a cert rejection. True timeouts come through as AbortError.
const CERT_MIN_MS = 20;
const CERT_MAX_MS = 2000;

export async function testHttpReachable(
  url: string,
  timeoutMs = 10000,
): Promise<{ reachable: boolean; certError: boolean }> {
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    // no-cors: opaque responses resolve fine; CORS failures and cert rejections both throw TypeError
    await fetch(url, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return { reachable: true, certError: false };
  } catch (err) {
    const elapsed = performance.now() - start;
    const wasAborted = err instanceof DOMException && err.name === "AbortError";
    const certError =
      !wasAborted &&
      elapsed >= CERT_MIN_MS &&
      elapsed < CERT_MAX_MS &&
      url.startsWith("https:");
    return { reachable: false, certError };
  }
}

export function httpErrorMessage(url: string, certError: boolean): string {
  if (certError) {
    return t("connections:errors.certNotTrusted", { url });
  }
  try {
    if (new URL(url).protocol === "https:") {
      return t("connections:errors.httpsNotReachable");
    }
  } catch {}
  return t("connections:errors.httpNotReachable");
}

export function connectionTypeIcon(type: ConnectionType): LucideIcon {
  if (type === "http") {
    return Globe;
  }
  if (type === "bluetooth") {
    return Bluetooth;
  }
  return Cable;
}

export function formatConnectionSubtext(conn: Connection): string {
  if (conn.type === "http") {
    return conn.url;
  }
  if (conn.type === "bluetooth") {
    return conn.deviceName || conn.deviceId || "No device selected";
  }
  const v = conn.usbVendorId ? conn.usbVendorId.toString(16) : "?";
  const p = conn.usbProductId ? conn.usbProductId.toString(16) : "?";
  return `USB ${v}:${p}`;
}
