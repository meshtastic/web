import type {
  Connection,
  ConnectionStatus,
  ConnectionType,
  NewConnection,
} from "@app/core/stores/deviceStore/types";
import { randId } from "@app/core/utils/randId";
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

export async function testHttpReachable(
  url: string,
  timeoutMs = 10000,
): Promise<{ reachable: boolean; certError: boolean }> {
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
    const wasAborted = err instanceof DOMException && err.name === "AbortError";
    // For HTTPS: any non-timeout failure is a cert rejection — the browser throws the same TypeError
    // for untrusted certs as for network errors, but a true timeout always comes through as AbortError.
    const certError = !wasAborted && url.startsWith("https:");
    return { reachable: false, certError };
  }
}

export function httpErrorMessage(url: string, certError: boolean): string {
  if (certError) {
    return `Self-signed certificate not trusted. Open ${url} in a new tab, accept the security warning, then return here and try again.`;
  }
  try {
    if (new URL(url).protocol === "https:") {
      return "HTTPS endpoint not reachable. Check that the device is online.";
    }
  } catch {}
  return "HTTP endpoint not reachable (may be blocked by CORS or a network issue)";
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
