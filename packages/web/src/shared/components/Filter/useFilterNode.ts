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
    (
      node: Protobuf.Mesh.NodeInfo,
      filterOverrides?: Partial<FilterState>,
    ): boolean => {
      const filterState: FilterState = {
        ...defaultFilterValues,
        ...filterOverrides,
      };

      const nodeName = filterState.nodeName.toLowerCase();
      if (nodeName) {
        const short = node.user?.shortName?.toLowerCase() ?? "";
        const long = node.user?.longName?.toLowerCase() ?? "";
        const numStr = node.num.toString();
        const hex = numberToHexUnpadded(node.num);

        if (
          !short.includes(nodeName) &&
          !long.includes(nodeName) &&
          !numStr.includes(nodeName) &&
          !hex.includes(nodeName.replace(/!/g, ""))
        ) {
          return false;
        }
      }

      const hops = node.hopsAway ?? 7;
      if (
        (node.hopsAway === undefined &&
          !shallowEqualArray(
            filterState.hopsAway,
            defaultFilterValues.hopsAway,
          )) || // If hops are unknown, hide node if state is not default
        hops < filterState.hopsAway[0] ||
        hops > filterState.hopsAway[1]
      ) {
        return false;
      }

      if (
        (filterState.hopsUnknown === true && node.hopsAway !== undefined) ||
        (filterState.hopsUnknown === false && node.hopsAway === undefined)
      ) {
        return false;
      }

      const secondsAgo = Math.max(0, Date.now() / 1000 - (node.lastHeard ?? 0));
      if (
        (node.lastHeard === 0 &&
          !shallowEqualArray(
            filterState.lastHeard,
            defaultFilterValues.lastHeard,
          )) || // If lastHeard is unknown (0), hide node if state is not default
        secondsAgo < filterState.lastHeard[0] ||
        (secondsAgo > filterState.lastHeard[1] &&
          filterState.lastHeard[1] !== defaultFilterValues.lastHeard[1])
      ) {
        return false;
      }

      if (
        (filterState.showUnheard === true && (node.lastHeard ?? 0) !== 0) ||
        (filterState.showUnheard === false && (node.lastHeard ?? 0) === 0)
      ) {
        return false;
      }

      if (
        typeof filterState.isFavorite !== "undefined" &&
        node.isFavorite !== filterState.isFavorite
      ) {
        return false;
      }

      if (
        typeof filterState.viaMqtt !== "undefined" &&
        node.viaMqtt !== filterState.viaMqtt
      ) {
        return false;
      }

      const snr = node.snr ?? -20;
      if (
        (node.snr === undefined &&
          !shallowEqualArray(filterState.snr, defaultFilterValues.snr)) ||
        (snr < filterState.snr[0] &&
          filterState.snr[0] !== defaultFilterValues.snr[0]) ||
        (snr > filterState.snr[1] &&
          filterState.snr[1] !== defaultFilterValues.snr[1])
      ) {
        return false;
      }

      const channelUtilization = node.deviceMetrics?.channelUtilization ?? 0;
      if (
        (node.deviceMetrics?.channelUtilization === undefined &&
          !shallowEqualArray(
            filterState.channelUtilization,
            defaultFilterValues.channelUtilization,
          )) ||
        channelUtilization < filterState.channelUtilization[0] ||
        channelUtilization > filterState.channelUtilization[1]
      ) {
        return false;
      }

      const airUtilTx = node.deviceMetrics?.airUtilTx ?? 0;
      if (
        (node.deviceMetrics?.airUtilTx === undefined &&
          !shallowEqualArray(
            filterState.airUtilTx,
            defaultFilterValues.airUtilTx,
          )) ||
        airUtilTx < filterState.airUtilTx[0] ||
        airUtilTx > filterState.airUtilTx[1]
      ) {
        return false;
      }

      const batt = node.deviceMetrics?.batteryLevel ?? 101;
      if (
        (node.deviceMetrics?.batteryLevel === undefined &&
          !shallowEqualArray(
            filterState.batteryLevel,
            defaultFilterValues.batteryLevel,
          )) ||
        batt < filterState.batteryLevel[0] ||
        batt > filterState.batteryLevel[1]
      ) {
        return false;
      }

      const voltage = Math.abs(node.deviceMetrics?.voltage ?? 0);
      if (
        (node.deviceMetrics?.voltage === undefined &&
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
        node.user?.role ?? Protobuf.Config.Config_DeviceConfig_Role.CLIENT;
      if (
        (node.user?.role === undefined &&
          !shallowEqualArray(filterState.role, defaultFilterValues.role)) ||
        !filterState.role.includes(role)
      ) {
        return false;
      }

      const hwModel: Protobuf.Mesh.HardwareModel =
        node.user?.hwModel ?? Protobuf.Mesh.HardwareModel.UNSET;
      if (
        (node.user?.hwModel === undefined &&
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
