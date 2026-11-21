import { formatRelativeTime } from "@core/utils/timeFormat.ts";

/**
 * Locale-aware formatting for node measurements. Units come from Intl where
 * it has them (meter, kilometer, percent); dB and volt are not Intl units,
 * so those helpers return only the number and the caller adds the unit.
 */

/** "850 m", "12.3 km", "250 km". */
export const formatDistance = (meters: number, locale: string): string => {
  if (meters < 1000) {
    return new Intl.NumberFormat(locale, {
      style: "unit",
      unit: "meter",
      maximumFractionDigits: 0,
    }).format(Math.round(meters));
  }
  const km = meters / 1000;
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "kilometer",
    maximumFractionDigits: km < 100 ? 1 : 0,
  }).format(km);
};

/** "-9.0", "4.5": always one decimal, as radios report quarter-dB steps. */
export const formatSnrValue = (snr: number, locale: string): string =>
  new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(snr);

/** "87%". */
export const formatPercent = (
  value: number,
  locale: string,
  fractionDigits = 0,
): string =>
  new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value / 100);

/** "3.92": Intl has no volt unit, so the caller adds it. */
export const formatVoltageValue = (volts: number, locale: string): string =>
  new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(volts);

/** "5 minutes ago"; undefined when the node was never heard. */
export const formatLastHeard = (
  lastHeardMs: number | undefined,
  now: number,
  locale: string,
): string | undefined =>
  lastHeardMs === undefined
    ? undefined
    : formatRelativeTime(Math.min(lastHeardMs, now), now, locale);

/** "37.77490, -122.41940": five decimals is about a metre. */
export const formatCoordinates = (
  [lng, lat]: readonly [number, number],
  locale: string,
): string => {
  const fmt = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  });
  return `${fmt.format(lat)}, ${fmt.format(lng)}`;
};

/** OpenStreetMap link centred on a position. */
export const openStreetMapUrl = ([lng, lat]: readonly [
  number,
  number,
]): string =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
