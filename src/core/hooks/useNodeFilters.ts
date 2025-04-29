import { useCallback, useMemo, useState } from "react";
import { Protobuf } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";

interface BooleanFilter {
  key: string;
  label: string;
  group: string;
  type: "boolean";
  predicate: (node: Protobuf.Mesh.NodeInfo, value: boolean) => boolean;
}

interface RangeFilter {
  key: string;
  label: string;
  group: string;
  type: "range";
  bounds: [number, number];
  predicate: (node: Protobuf.Mesh.NodeInfo, value: [number, number]) => boolean;
}

interface SearchFilter {
  key: string;
  label: string;
  group: string;
  type: "search";
  predicate: (node: Protobuf.Mesh.NodeInfo, value: string) => boolean;
}

interface MultiFilter {
  key: string;
  label: string;
  group: string;
  type: "multi";
  options: string[];
  predicate: (node: Protobuf.Mesh.NodeInfo, value: string[]) => boolean;
}

export type FilterConfig =
  | BooleanFilter
  | RangeFilter
  | SearchFilter
  | MultiFilter;

export type FilterValueMap = {
  [C in FilterConfig as C["key"]]: C extends BooleanFilter ? boolean
    : C extends RangeFilter ? [number, number]
    : C extends SearchFilter ? string
    : C extends MultiFilter ? string[]
    : never;
};

// Defines all node filters in this object
export const filterConfigs: FilterConfig[] = [
  {
    key: "searchText",
    label: "Node name/number",
    group: "General",
    type: "search",
    predicate: (node, text: string) => {
      if (!text) return true;
      const shortName = node.user?.shortName?.toString().toLowerCase() ?? "";
      const longName = node.user?.longName?.toString().toLowerCase() ?? "";
      const nodeNum = node.num?.toString() ?? "";
      const nodeNumHex = numberToHexUnpadded(node.num) ?? "";
      const search = text.toLowerCase();
      return shortName.includes(search) || longName.includes(search) ||
        nodeNum.includes(search) ||
        nodeNumHex.includes(search.replace(/!/g, ""));
    },
  },
  {
    key: "hopRange",
    label: "Number of hops",
    group: "General",
    type: "range",
    bounds: [0, 7],
    predicate: (node, [min, max]: [number, number]) => {
      const hops = node.hopsAway ?? 7;
      return hops >= min && hops <= max;
    },
  },
  {
    key: "lastHeard",
    label: "Last heard",
    group: "General",
    type: "range",
    bounds: [0, 864000], // 10 days
    predicate: (node, [min, max]: [number, number]) => {
      const secondsAgo = Date.now() / 1000 - node.lastHeard;
      return (secondsAgo >= min && secondsAgo <= max) ||
        (secondsAgo >= min && max == 864000);
    },
  },
  {
    key: "favOnly",
    label: "Show favourites only",
    group: "General",
    type: "boolean",
    predicate: (node, favOnly: boolean) => !favOnly || node.isFavorite,
  },
  {
    key: "viaMqtt",
    label: "Hide MQTT-connected nodes",
    group: "General",
    type: "boolean",
    predicate: (node, hide: boolean) => !hide || !node.viaMqtt,
  },
  {
    key: "snr",
    label: "SNR (db)",
    group: "Metrics",
    type: "range",
    bounds: [-20, 10],
    predicate: (node, [min, max]: [number, number]) => {
      const snr = node.snr ?? -20;
      return snr >= min && snr <= max;
    },
  },
  {
    key: "channelUtilization",
    label: "Channel Utilization (%)",
    group: "Metrics",
    type: "range",
    bounds: [0, 100],
    predicate: (node, [min, max]: [number, number]) => {
      const channelUtilization = node.deviceMetrics?.channelUtilization ?? 0;
      return channelUtilization >= min && channelUtilization <= max;
    },
  },
  {
    key: "airUtilTx",
    label: "Airtime Utilization (%)",
    group: "Metrics",
    type: "range",
    bounds: [0, 100],
    predicate: (node, [min, max]: [number, number]) => {
      const airUtilTx = node.deviceMetrics?.airUtilTx ?? 0;
      return airUtilTx >= min && airUtilTx <= max;
    },
  },
  {
    key: "battery",
    label: "Battery level (%)",
    group: "Metrics",
    type: "range",
    bounds: [0, 101],
    predicate: (node, [min, max]: [number, number]) => {
      const batt = node.deviceMetrics?.batteryLevel ?? 101;
      return batt >= min && batt <= max;
    },
  },
  {
    key: "voltage",
    label: "Battery voltage (V)",
    group: "Metrics",
    type: "range",
    bounds: [0.1, 5.0],
    predicate: (node, [min, max]: [number, number]) => {
      const batt = node.deviceMetrics?.voltage ?? 5;
      return batt >= min && batt <= max;
    },
  },
  {
    key: "role",
    label: "Role",
    group: "Role",
    type: "multi",
    options: Object.keys(Protobuf.Config.Config_DeviceConfig_Role)
      .filter((k) => isNaN(Number(k)))
      .map((k) => {
        const spaced = k.replace(/_/g, " ");
        return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
      }),
    predicate: (node, selected) => {
      return selected.map((k) => {
        const unSpaced = k.replace(/ /g, "_");
        return unSpaced.toUpperCase();
      }).includes(
        Protobuf.Config.Config_DeviceConfig_Role[node.user?.role ?? 0],
      );
    },
  },
  {
    key: "hwModel",
    label: "Hardware model",
    group: "Hardware",
    type: "multi",
    options: Object.keys(Protobuf.Mesh.HardwareModel)
      .filter((k) => isNaN(Number(k)))
      .map((k) => {
        return k.replace(/_/g, " ");
      }),
    predicate: (node, selected) => {
      return selected.map((k) => {
        const unSpaced = k.replace(/ /g, "_");
        return unSpaced.toUpperCase();
      }).includes(Protobuf.Mesh.HardwareModel[node.user?.hwModel ?? 0]);
    },
  },
];

export function useNodeFilters(nodes: Protobuf.Mesh.NodeInfo[]) {
  const defaultState = useMemo(() => {
    return filterConfigs.reduce((acc, cfg) => {
      switch (cfg.type) {
        case "boolean":
          acc[cfg.key] = false;
          break;
        case "range":
          acc[cfg.key] = cfg.bounds;
          break;
        case "search":
          acc[cfg.key] = "";
          break;
        case "multi":
          acc[cfg.key] = cfg.options;
          break;
      }
      return acc;
    }, {} as FilterValueMap);
  }, []);

  const [filters, setFilters] = useState<FilterValueMap>(
    defaultState,
  );

  const groupedFilterConfigs = useMemo(() => {
    return filterConfigs.reduce<Record<string, FilterConfig[]>>((acc, cfg) => {
      const g = "group" in cfg ? cfg.group : "General";
      if (!acc[g]) acc[g] = [];
      acc[g].push(cfg);
      return acc;
    }, {});
  }, [filterConfigs]);

  const resetFilters = useCallback(() => {
    setFilters(defaultState);
  }, [defaultState]);

  const onFilterChange = useCallback(
    <K extends keyof FilterValueMap>(key: K, value: FilterValueMap[K]) => {
      setFilters((f) => ({ ...f, [key]: value }));
    },
    [],
  );

  const filteredNodes = useMemo(
    () =>
      nodes.filter((node) =>
        filterConfigs.every((cfg) => {
          const val = filters[cfg.key];
          switch (cfg.type) {
            case "boolean":
              if (typeof val !== "boolean") return true;
              return cfg.predicate(node, val);

            case "range": {
              if (
                !Array.isArray(val) ||
                val.length !== 2 ||
                typeof val[0] !== "number" ||
                typeof val[1] !== "number"
              ) {
                return true;
              }
              const tuple: [number, number] = [val[0], val[1]];
              return cfg.predicate(node, tuple);
            }
            case "multi": {
              const safeArray = (() => {
                if (!Array.isArray(val)) return [];
                return val.filter((x): x is string => typeof x === "string");
              })();
              return cfg.predicate(node, safeArray);
            }
            case "search":
              if (typeof val !== "string") return true;
              return cfg.predicate(node, val);
          }
        })
      ),
    [nodes, filters],
  );

  return {
    filters,
    defaultState,
    onFilterChange,
    resetFilters,
    filteredNodes,
    groupedFilterConfigs,
  };
}
