import type {
  Connection,
  ConnectionStatus,
  ConnectionType,
  NewConnection,
} from "@app/core/stores/deviceStore/types";
import { randId } from "@app/core/utils/randId";
import { Bluetooth, Cable, Globe, EthernetPort, type LucideIcon } from "lucide-react";

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
  if (input.type === "serial") {
    return {
      ...base,
      type: "serial",
      usbVendorId: input.usbVendorId,
      usbProductId: input.usbProductId,
    };
  }
  if (input.type === "ws") {
    return {
      ...base,
      type: "ws",
      url: input.url,
      isDefault: false,
      name: input.name.length === 0 ? input.url.toString() : input.name,
    };
  }
  throw new Error(`Unknown connection type: ${input.type}`);
}

export async function testHttpReachable(
  url: string,
  timeoutMs = 2500,
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    // Use no-cors to avoid CORS failure; opaque responses resolve but status is 0
    await fetch(url, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return true;
  } catch {
    return false;
  }
}

export function connectionTypeIcon(type: ConnectionType): LucideIcon {
  if (type === "http") {
    return Globe;
  }
  if (type === "bluetooth") {
    return Bluetooth;
  }
  if (type === "serial") {
    return Cable;
  }
  if (type === "ws") {
    return EthernetPort;
  }
}

export function formatConnectionSubtext(conn: Connection): string {
  if (conn.type === "http") {
    return conn.url;
  }
  if (conn.type === "bluetooth") {
    return conn.deviceName || conn.deviceId || "No device selected";
  }
  if (conn.type === "serial") {
    const v = conn.usbVendorId ? conn.usbVendorId.toString(16) : "?";
    const p = conn.usbProductId ? conn.usbProductId.toString(16) : "?";
    return `USB ${v}:${p}`;
  }
  if (conn.type === "ws") {
    return conn.url.toString();
  }
}
