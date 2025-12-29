import { fromByteArray, toByteArray } from "base64-js";
import { QRCode } from "react-qrcode-logo";

export interface DeviceInfo {
  nodeNum: number;
  longName: string | null;
  shortName: string | null;
  publicKey: string | null; // base64-encoded
}

export interface DeviceQRCodeProps {
  device: DeviceInfo;
  size?: number;
}

/**
 * Encodes device info into a URL-safe base64 string
 */
function encodeDeviceInfo(device: DeviceInfo): string {
  const data = {
    n: device.nodeNum,
    l: device.longName ?? undefined,
    s: device.shortName ?? undefined,
    k: device.publicKey ?? undefined,
  };

  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  const base64 = fromByteArray(bytes);

  // Make URL-safe: remove padding, replace + with -, replace / with _
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/**
 * Decodes a URL-safe base64 string back to device info
 */
export function decodeDeviceInfo(encoded: string): DeviceInfo | null {
  try {
    // Restore base64 padding and characters
    let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padding = (4 - (base64.length % 4)) % 4;
    base64 += "=".repeat(padding);

    const bytes = toByteArray(base64);
    const json = new TextDecoder().decode(bytes);
    const data = JSON.parse(json) as {
      n: number;
      l?: string;
      s?: string;
      k?: string;
    };

    return {
      nodeNum: data.n,
      longName: data.l ?? null,
      shortName: data.s ?? null,
      publicKey: data.k ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Generates a shareable URL for device contact info
 */
export function generateDeviceShareUrl(device: DeviceInfo): string {
  const encoded = encodeDeviceInfo(device);
  return `https://meshtastic.org/d/#${encoded}`;
}

/**
 * Standalone QR code component for sharing device contact information.
 * Encodes nodeNum, longName, shortName, and publicKey into a scannable QR code.
 */
export const DeviceQRCode = ({ device, size = 200 }: DeviceQRCodeProps) => {
  const url = generateDeviceShareUrl(device);

  return <QRCode value={url} size={size} qrStyle="dots" />;
};
