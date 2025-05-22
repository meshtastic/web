import { Protobuf } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { useMemo } from "react";

export type FilterState = {
  nodeName: string;
  hopsAway: [number, number];
  lastHeard: [number, number];
  isFavorite: boolean | undefined; // undefined -> don't filter
  viaMqtt: boolean | undefined; // undefined -> don't filter
  snr: [number, number];
  channelUtilization: [number, number];
  airUtilTx: [number, number];
  batteryLevel: [number, number];
  voltage: [number, number];
  role: (Protobuf.Config.Config_DeviceConfig_Role)[];
  hwModel: (Protobuf.Mesh.HardwareModel)[];
};

export function useFilterNode() {
  const defaultFilterValues = useMemo<FilterState>(() => ({
    nodeName: "",
    hopsAway: [0, 7],
    lastHeard: [0, 864000], // 0-10 days
    isFavorite: undefined,
    viaMqtt: undefined,
    snr: [-20, 10],
    channelUtilization: [0, 100],
    airUtilTx: [0, 100],
    batteryLevel: [0, 101],
    voltage: [0, 5],
    role: Object.values(Protobuf.Config.Config_DeviceConfig_Role).filter(
      (v): v is Protobuf.Config.Config_DeviceConfig_Role =>
        typeof v === "number",
    ),
    hwModel: Object.values(Protobuf.Mesh.HardwareModel).filter(
      (v): v is Protobuf.Mesh.HardwareModel => typeof v === "number",
    ),
  }), []);

  function nodeFilter(
    node: Protobuf.Mesh.NodeInfo,
    filterOverrides?: Partial<FilterState>,
  ): boolean {
    const filterState: FilterState = {
      ...defaultFilterValues,
      ...filterOverrides,
    };

    if (!node.user) return false;

    const nodeName = filterState.nodeName.toLowerCase();
    if (
      !(
        node.user?.shortName.toLowerCase().includes(nodeName) ||
        node.user?.longName.toLowerCase().includes(nodeName) ||
        node?.num.toString().includes(nodeName) ||
        numberToHexUnpadded(node?.num).includes(
          nodeName.replace(/!/g, ""),
        )
      )
    ) return false;

    const hops = node?.hopsAway ?? 7;
    if (hops < filterState.hopsAway[0] || hops > filterState.hopsAway[1]) {
      return false;
    }

    const secondsAgo = Date.now() / 1000 - (node?.lastHeard ?? 0);
    if (
      secondsAgo < filterState.lastHeard[0] ||
      (
        secondsAgo > filterState.lastHeard[1] &&
        filterState.lastHeard[1] !== defaultFilterValues.lastHeard[1]
      )
    ) return false;

    if (
      typeof filterState.isFavorite !== "undefined" &&
      node.isFavorite !== filterState.isFavorite
    ) return false;

    if (
      typeof filterState.viaMqtt !== "undefined" &&
      node.viaMqtt !== filterState.viaMqtt
    ) return false;

    const snr = node?.snr ?? -20;
    if (
      snr < filterState.snr[0] ||
      snr > filterState.snr[1]
    ) return false;

    const channelUtilization = node?.deviceMetrics?.channelUtilization ?? 0;
    if (
      channelUtilization < filterState.channelUtilization[0] ||
      channelUtilization > filterState.channelUtilization[1]
    ) return false;

    const airUtilTx = node?.deviceMetrics?.airUtilTx ?? 0;
    if (
      airUtilTx < filterState.airUtilTx[0] ||
      airUtilTx > filterState.airUtilTx[1]
    ) return false;

    const batt = node?.deviceMetrics?.batteryLevel ?? 101;
    if (
      batt < filterState.batteryLevel[0] ||
      batt > filterState.batteryLevel[1]
    ) return false;

    const voltage = node?.deviceMetrics?.voltage ?? 0;
    if (
      voltage < filterState.voltage[0] ||
      voltage > filterState.voltage[1]
    ) return false;

    const role: Protobuf.Config.Config_DeviceConfig_Role = node.user?.role ??
      Protobuf.Config.Config_DeviceConfig_Role.CLIENT;
    if (!filterState.role.includes(role)) return false;

    const hwModel: Protobuf.Mesh.HardwareModel = node.user?.hwModel ??
      Protobuf.Mesh.HardwareModel.UNSET;
    if (!filterState.hwModel.includes(hwModel)) return false;

    // All conditions are true
    return true;
  }

  // deno-lint-ignore no-explicit-any
  function shallowEqualArray(a: any[], b: any[]) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }

  function isFilterDirty(
    current: FilterState,
    overrides?: Partial<FilterState>,
  ): boolean {
    const base: FilterState = overrides
      ? { ...defaultFilterValues, ...overrides }
      : defaultFilterValues;

    return (Object.keys(base) as (keyof FilterState)[]).some((key) => {
      const curr = current[key];
      const def = base[key];
      return Array.isArray(def) && Array.isArray(curr)
        ? !shallowEqualArray(curr, def)
        : curr !== def;
    });
  }

  return { nodeFilter, defaultFilterValues, isFilterDirty };
}
