import logger from "@core/services/logger";
import type { Connection } from "@db/index";
import type { ConnectionType } from "@db/repositories/ConnectionRepository";
import { Bluetooth, Cable, Globe, type LucideIcon } from "lucide-react";

async function tryFetch(url: string, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);
    logger.debug(
      `[testHttpReachable] Success - type: ${response.type}, status: ${response.status}`,
    );
    return true;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

export async function testHttpReachable(
  url: string,
  timeoutMs = 4000,
  retries = 2,
  onAttempt?: (attempt: number, total: number) => void,
): Promise<boolean> {
  logger.debug(`[testHttpReachable] Testing URL: ${url}`);
  const totalAttempts = retries + 1;

  for (let attempt = 0; attempt <= retries; attempt++) {
    onAttempt?.(attempt + 1, totalAttempts);
    try {
      return await tryFetch(url, timeoutMs);
    } catch (error) {
      logger.debug(
        `[testHttpReachable] Attempt ${attempt + 1}/${totalAttempts} failed:`,
        error,
      );
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }

  logger.error(`[testHttpReachable] All ${totalAttempts} attempts failed`);
  return false;
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
