import {
  formatDistance,
  formatLastHeard,
  formatPercent,
  formatSnrValue,
  formatVoltageValue,
} from "@core/nodes/format.ts";
import { hopsDisplay, type NodeRow } from "@core/nodes/nodeRow.ts";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export interface NodeLabels {
  readonly locale: string;
  /** "Direct", "2 hops", "1 hop · via MQTT", "Unknown hops", "This radio". */
  hops: (row: NodeRow) => string;
  /** The hop count alone for a tile: "Direct", "2", "This radio" or a dash. */
  hopsValue: (row: NodeRow) => string;
  /** "5 minutes ago" or "Never". */
  lastHeard: (row: NodeRow) => string;
  /** "-9.0 dB" or a dash (never heard, or the connected radio). */
  snr: (row: NodeRow) => string;
  /** "87%", "Plugged in" or a dash. */
  battery: (row: NodeRow) => string;
  voltage: (row: NodeRow) => string | undefined;
  /** "12.3 km" or a dash. */
  distance: (row: NodeRow) => string;
  /** "2 hops · heard 3 minutes ago"; "This radio" for the local node. */
  summary: (row: NodeRow) => string;
  notAvailable: string;
}

/** Localised display strings for node rows, bound to a clock. */
export function useNodeLabels(now: number): NodeLabels {
  const { t, i18n } = useTranslation("nodes");
  const locale = i18n.language;

  return useMemo<NodeLabels>(() => {
    const notAvailable = t("value.notAvailable");
    const thisRadio = t("value.thisRadio");
    const hops = (row: NodeRow): string => {
      const display = hopsDisplay(row);
      if (display.kind === "self") {
        return thisRadio;
      }
      const base =
        display.kind === "direct"
          ? t("value.direct")
          : display.kind === "hops"
            ? t("value.hops", { count: display.count })
            : t("value.hopsUnknown");
      return display.viaMqtt ? `${base} · ${t("value.viaMqtt")}` : base;
    };
    const hopsValue = (row: NodeRow): string => {
      const display = hopsDisplay(row);
      switch (display.kind) {
        case "self":
          return thisRadio;
        case "direct":
          return t("value.direct");
        case "hops":
          return new Intl.NumberFormat(locale).format(display.count);
        case "unknown":
          return notAvailable;
      }
    };
    const lastHeardText = (row: NodeRow): string | undefined =>
      formatLastHeard(row.lastHeardMs, now, locale);
    return {
      locale,
      notAvailable,
      hops,
      hopsValue,
      lastHeard: (row) => lastHeardText(row) ?? t("value.never"),
      snr: (row) =>
        row.snr === undefined
          ? notAvailable
          : t("value.db", { value: formatSnrValue(row.snr, locale) }),
      battery: (row) =>
        !row.battery
          ? notAvailable
          : row.battery.kind === "pluggedIn"
            ? t("value.pluggedIn")
            : formatPercent(row.battery.percent, locale),
      voltage: (row) =>
        row.voltage === undefined
          ? undefined
          : t("value.volts", {
              value: formatVoltageValue(row.voltage, locale),
            }),
      distance: (row) =>
        row.distanceMeters === undefined
          ? notAvailable
          : formatDistance(row.distanceMeters, locale),
      summary: (row) => {
        if (row.isSelf) {
          return thisRadio;
        }
        const heard = lastHeardText(row);
        return `${hops(row)} · ${
          heard ? t("value.heardAgo", { time: heard }) : t("value.neverHeard")
        }`;
      },
    };
  }, [t, locale, now]);
}
