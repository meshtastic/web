import { useCallback, useMemo, useState } from "react";
import type { Protobuf } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";

interface BooleanFilter {
  key: string;
  label: string;
  type: "boolean";
  predicate: (node: Node, value: boolean) => boolean;
}

interface RangeFilter {
  key: string;
  label: string;
  type: "range";
  bounds: [number, number];
  predicate: (node: Node, value: [number, number]) => boolean;
}

interface SearchFilter {
  key: string;
  label: string;
  type: "search";
  predicate: (node: Node, value: string) => boolean;
}

export type FilterConfig = BooleanFilter | RangeFilter | SearchFilter;

export type FilterValueMap = {
  [C in FilterConfig as C["key"]]: C extends BooleanFilter ? boolean
    : C extends RangeFilter ? [number, number]
    : C extends SearchFilter ? string
    : never;
};

// Defines all node filters in this object
export const filterConfigs: FilterConfig[] = [
  {
    key: "searchText",
    label: "Node name/number",
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
    key: "favOnly",
    label: "Show favourites only",
    type: "boolean",
    predicate: (node, favOnly: boolean) => !favOnly || node.isFavorite,
  },
  {
    key: "hopRange",
    label: "Number of hops",
    type: "range",
    bounds: [0, 7],
    predicate: (node, [min, max]: [number, number]) => {
      const hops = node.hopsAway ?? 7;
      return hops >= min && hops <= max;
    },
  },
  {
    key: "channelUtilization",
    label: "Channel Utilization (%)",
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
    type: "range",
    bounds: [0, 101],
    predicate: (node, [min, max]: [number, number]) => {
      const batt = node.deviceMetrics?.batteryLevel ?? 101;
      return batt >= min && batt <= max;
    },
  },
  {
    key: "viaMqtt",
    label: "Hide MQTT-connected nodes",
    type: "boolean",
    predicate: (node, hide: boolean) => !hide || !node.viaMqtt,
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
          acc[cfg.key] = cfg.bounds!;
          break;
        case "search":
          acc[cfg.key] = "";
          break;
      }
      return acc;
    }, {} as FilterValueMap);
  }, []);

  const [filters, setFilters] = useState<FilterValueMap>(
    defaultState,
  );

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
        filterConfigs.every((cfg) => cfg.predicate(node, filters[cfg.key]))
      ),
    [nodes, filters],
  );

  return {
    filters,
    onFilterChange,
    resetFilters,
    filteredNodes,
    filterConfigs,
  };
}
