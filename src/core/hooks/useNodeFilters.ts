import { useState, useMemo, useCallback } from "react";
import type { Protobuf } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";

export type FilterValue = 
  | boolean 
  | [number, number] 
  | string[]
  | string;   

export interface FilterConfig<T extends FilterValue = FilterValue> {
  key: string;
  label: string;
  type: "boolean" | "range" | "search";
  bounds?: [number, number];
  options?: string[];
  predicate: (node: Protobuf.Mesh.NodeInfo, value: T) => boolean;
}

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
      return shortName.includes(search) || longName.includes(search) || nodeNum.includes(search) || nodeNumHex.includes(search.replace(/!/g, ""));
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
  }
];

export function useNodeFilters(nodes: Protobuf.Mesh.NodeInfo[]) {
  const defaultState = useMemo<Record<string, FilterValue>>(() => {
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
    }, {} as Record<string, FilterValue>);
  }, []);

  const [filters, setFilters] = useState<Record<string, FilterValue>>(defaultState);

  const resetFilters = useCallback(() => {
    setFilters(defaultState);
  }, [defaultState]);

  const onFilterChange = useCallback(
    (key: string, value: FilterValue) => {
      setFilters((f) => ({ ...f, [key]: value }));
    },
    []
  );

  const filteredNodes = useMemo(
    () =>
      nodes.filter((node) =>
        filterConfigs.every((cfg) =>
          cfg.predicate(node, filters[cfg.key])
        )
      ),
    [nodes, filters]
  );

  return { filters, onFilterChange, resetFilters, filteredNodes, filterConfigs };
}