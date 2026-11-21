import {
  formatDistance,
  formatLastHeard,
  formatPercent,
  formatSnrValue,
  formatVoltageValue,
} from "@core/nodes/format.ts";
import type { NodeRow } from "@core/nodes/nodeRow.ts";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export interface NodeLabels {
  readonly locale: string;
  /** "Direct", "2 hops", "1 hop · via MQTT", "Unknown hops". */
  hops: (row: NodeRow) => string;
  /** "5 minutes ago" or "Never". */
  lastHeard: (row: NodeRow) => string;
  /** "-9.0 dB" or a dash. */
  snr: (row: NodeRow) => string;
  /** "87%", "Plugged in" or a dash. */
  battery: (row: NodeRow) => string;
  voltage: (row: NodeRow) => string | undefined;
  /** "12.3 km" or a dash. */
  distance: (row: NodeRow) => string;
  /** "2 hops · heard 3 minutes ago"; "This device" for the local node. */
  summary: (row: NodeRow) => string;
  notAvailable: string;
}

/** Localised display strings for node rows, bound to a clock. */
export function useNodeLabels(now: number): NodeLabels {
  const { t, i18n } = useTranslation("nodes");
  const locale = i18n.language;

  return useMemo<NodeLabels>(() => {
    const notAvailable = t("value.notAvailable");
    const hops = (row: NodeRow): string => {
      const base = row.isDirect
        ? t("value.direct")
        : row.hops === undefined
          ? t("value.hopsUnknown")
          : t("value.hops", { count: row.hops });
      return row.viaMqtt ? `${base} · ${t("value.viaMqtt")}` : base;
    };
    const lastHeardText = (row: NodeRow): string | undefined =>
      formatLastHeard(row.lastHeardMs, now, locale);
    return {
      locale,
      notAvailable,
      hops,
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
          return t("value.thisDevice");
        }
        const heard = lastHeardText(row);
        return `${hops(row)} · ${
          heard ? t("value.heardAgo", { time: heard }) : t("value.neverHeard")
        }`;
      },
    };
  }, [t, locale, now]);
}
