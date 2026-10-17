/**
 * Firmware support levels, matching the Android app's DeviceVersion checks.
 * Below {@link MIN_FIRMWARE_VERSION} the client still works but the user
 * should update; below {@link ABS_MIN_FIRMWARE_VERSION} the client refuses
 * to connect. A version that doesn't parse (lockdown sends an empty one) is
 * "unknown", never "too old".
 */
export const MIN_FIRMWARE_VERSION = "2.5.14";
export const ABS_MIN_FIRMWARE_VERSION = "2.3.15";

export type FirmwareSupport =
  | "supported"
  | "shouldUpdate"
  | "tooOld"
  | "unknown";

/** Parse "2.7.15.abc1234" or "2.7.15" into [major, minor, patch]. */
export function parseFirmwareVersion(
  version: string,
): [number, number, number] | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
  if (!match) return undefined;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareFirmwareVersions(
  a: [number, number, number],
  b: [number, number, number],
): number {
  for (let i = 0; i < 3; i++) {
    const diff = a[i]! - b[i]!;
    if (diff !== 0) return diff;
  }
  return 0;
}

/** True when `version` parses and is at least `minimum`. */
export function firmwareAtLeast(version: string, minimum: string): boolean {
  const v = parseFirmwareVersion(version);
  const min = parseFirmwareVersion(minimum);
  return !!v && !!min && compareFirmwareVersions(v, min) >= 0;
}

export function firmwareSupport(version: string): FirmwareSupport {
  if (!parseFirmwareVersion(version)) return "unknown";
  if (!firmwareAtLeast(version, ABS_MIN_FIRMWARE_VERSION)) return "tooOld";
  if (!firmwareAtLeast(version, MIN_FIRMWARE_VERSION)) return "shouldUpdate";
  return "supported";
}
