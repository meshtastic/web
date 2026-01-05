import type { Node } from "@data/schema";
import { Protobuf } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { useCallback, useMemo } from "react";

export type FilterState = {
  nodeName: string;
  hopsAway: [number, number];
  lastHeard: [number, number];
  isFavorite: boolean | undefined;
  viaMqtt: boolean | undefined;
  snr: [number, number];
  channelUtilization: [number, number];
  airUtilTx: [number, number];
  batteryLevel: [number, number];
  voltage: [number, number];
  role: Protobuf.Config.Config_DeviceConfig_Role[];
  hwModel: Protobuf.Mesh.HardwareModel[];
  showUnheard: boolean | undefined;
  hopsUnknown: boolean | undefined;
};

const shallowEqualArray = <T>(a: T[], b: T[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};

export function useFilterNode() {
  const defaultFilterValues = useMemo<FilterState>(
    () => ({
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
      hopsUnknown: undefined,
      showUnheard: undefined,
    }),
    [],
  );

  const nodeFilter = useCallback(
    (node: Node, filterOverrides?: Partial<FilterState>): boolean => {
      const filterState: FilterState = {
        ...defaultFilterValues,
        ...filterOverrides,
      };

      const nodeName = filterState.nodeName.toLowerCase();
      if (nodeName) {
        const short = node.shortName?.toLowerCase() ?? "";
        const long = node.longName?.toLowerCase() ?? "";
        const numStr = node.nodeNum.toString();
        const hex = numberToHexUnpadded(node.nodeNum);

        if (
          !short.includes(nodeName) &&
          !long.includes(nodeName) &&
          !numStr.includes(nodeName) &&
          !hex.includes(nodeName.replace(/!/g, ""))
        ) {
          return false;
        }
      }

      // Note: hopsAway is not available in Node schema (not stored in database)
      // Skip hops filtering for now - would need to add to schema if needed

      const lastHeardMs = node.lastHeard?.getTime() ?? 0;
      const secondsAgo = Math.max(0, (Date.now() - lastHeardMs) / 1000);
      if (
        (node.lastHeard === null &&
          !shallowEqualArray(
            filterState.lastHeard,
            defaultFilterValues.lastHeard,
          )) || // If lastHeard is unknown (null), hide node if state is not default
        secondsAgo < filterState.lastHeard[0] ||
        (secondsAgo > filterState.lastHeard[1] &&
          filterState.lastHeard[1] !== defaultFilterValues.lastHeard[1])
      ) {
        return false;
      }

      if (
        (filterState.showUnheard === true && node.lastHeard !== null) ||
        (filterState.showUnheard === false && node.lastHeard === null)
      ) {
        return false;
      }

      if (
        typeof filterState.isFavorite !== "undefined" &&
        node.isFavorite !== filterState.isFavorite
      ) {
        return false;
      }

      // Note: viaMqtt is not available in Node schema (not stored in database)
      // Skip viaMqtt filtering for now - would need to add to schema if needed

      const snr = node.snr ?? 0;
      if (
        (node.snr === null &&
          !shallowEqualArray(filterState.snr, defaultFilterValues.snr)) ||
        (snr < filterState.snr[0] &&
          filterState.snr[0] !== defaultFilterValues.snr[0]) ||
        (snr > filterState.snr[1] &&
          filterState.snr[1] !== defaultFilterValues.snr[1])
      ) {
        return false;
      }

      const channelUtilization = node.channelUtilization ?? 0;
      if (
        (node.channelUtilization === null &&
          !shallowEqualArray(
            filterState.channelUtilization,
            defaultFilterValues.channelUtilization,
          )) ||
        channelUtilization < filterState.channelUtilization[0] ||
        channelUtilization > filterState.channelUtilization[1]
      ) {
        return false;
      }

      const airUtilTx = node.airUtilTx ?? 0;
      if (
        (node.airUtilTx === null &&
          !shallowEqualArray(
            filterState.airUtilTx,
            defaultFilterValues.airUtilTx,
          )) ||
        airUtilTx < filterState.airUtilTx[0] ||
        airUtilTx > filterState.airUtilTx[1]
      ) {
        return false;
      }

      const batt = node.batteryLevel ?? 101;
      if (
        (node.batteryLevel === null &&
          !shallowEqualArray(
            filterState.batteryLevel,
            defaultFilterValues.batteryLevel,
          )) ||
        batt < filterState.batteryLevel[0] ||
        batt > filterState.batteryLevel[1]
      ) {
        return false;
      }

      const voltage = Math.abs(node.voltage ?? 0);
      if (
        (node.voltage === null &&
          !shallowEqualArray(
            filterState.voltage,
            defaultFilterValues.voltage,
          )) ||
        voltage < filterState.voltage[0] ||
        (voltage > filterState.voltage[1] &&
          filterState.voltage[1] !== defaultFilterValues.voltage[1])
      ) {
        return false;
      }

      const role: Protobuf.Config.Config_DeviceConfig_Role =
        node.role ?? Protobuf.Config.Config_DeviceConfig_Role.CLIENT;
      if (
        (node.role === null &&
          !shallowEqualArray(filterState.role, defaultFilterValues.role)) ||
        !filterState.role.includes(role)
      ) {
        return false;
      }

      const hwModel: Protobuf.Mesh.HardwareModel =
        node.hwModel ?? Protobuf.Mesh.HardwareModel.UNSET;
      if (
        (node.hwModel === null &&
          !shallowEqualArray(
            filterState.hwModel,
            defaultFilterValues.hwModel,
          )) ||
        !filterState.hwModel.includes(hwModel)
      ) {
        return false;
      }

      return true;
    },
    [defaultFilterValues],
  );

  const isFilterDirty = useCallback(
    (current: FilterState, overrides?: Partial<FilterState>): boolean => {
      const base: FilterState = overrides
        ? { ...defaultFilterValues, ...overrides }
        : defaultFilterValues;

      for (const key of Object.keys(base) as (keyof FilterState)[]) {
        const currentValue = current[key];
        const defaultValue = base[key];

        if (Array.isArray(defaultValue) && Array.isArray(currentValue)) {
          if (!shallowEqualArray(currentValue, defaultValue)) {
            return true;
          }
        } else if (currentValue !== defaultValue) {
          return true;
        }
      }

      return false;
    },
    [defaultFilterValues],
  );

  return { nodeFilter, defaultFilterValues, isFilterDirty };
}
