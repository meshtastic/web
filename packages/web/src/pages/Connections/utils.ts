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

export type ReachabilityFailureReason =
  | "timeout"
  | "cors"
  | "http-error"
  | "network";

export type ReachabilityResult =
  | { reachable: true }
  | { reachable: false; reason: ReachabilityFailureReason };

export async function testHttpReachable(
  url: string,
  timeoutMs = 3000,
  signal?: AbortSignal,
): Promise<ReachabilityResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Forward external abort into our controller
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
  }

  try {
    const response = await fetch(`${url}/api/v1/fromradio`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) {
      return { reachable: false, reason: "http-error" };
    }
    return { reachable: true };
  } catch (err) {
    clearTimeout(timer);
    if (
      err instanceof DOMException &&
      (err.name === "AbortError" || err.name === "TimeoutError")
    ) {
      return { reachable: false, reason: "timeout" };
    }
    if (err instanceof TypeError) {
      return { reachable: false, reason: "cors" };
    }
    return { reachable: false, reason: "network" };
  }
}

export function httpReachabilityMessage(
  url: string,
  reason: ReachabilityFailureReason,
): string {
  const isHTTPS = url.startsWith("https:");
  switch (reason) {
    case "timeout":
      return "Device did not respond. Make sure it is powered on and connected to the same network.";
    case "cors":
      return isHTTPS
        ? `Cannot reach device over HTTPS. If using a self-signed certificate, open ${url} in a new tab, accept the certificate warning, then try again.`
        : "Cannot reach device. Check that the address is correct and the device is on the same network.";
    case "http-error":
      return "Device responded with an error. It may be busy or running incompatible firmware.";
    case "network":
      return "Network error. Check your connection and the device address.";
  }
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
