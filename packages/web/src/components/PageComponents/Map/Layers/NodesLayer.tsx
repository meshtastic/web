import {
  fanOutOffsetsPx,
  groupNodesByIdenticalCoords,
  type PxOffset,
} from "@components/PageComponents/Map/cluster.ts";
import {
  generatePrecisionCircles,
  SourcePrecisionCircles,
} from "@components/PageComponents/Map/Layers/PrecisionLayer.tsx";
import { NodeMarker } from "@components/PageComponents/Map/Markers/NodeMarker.tsx";
import { StackBadge } from "@components/PageComponents/Map/Markers/StackBadge.tsx";
import { NodeDetail } from "@components/PageComponents/Map/Popups/NodeDetail.tsx";
import type { PopupState } from "@components/PageComponents/Map/Popups/PopupWrapper.tsx";
import { PopupWrapper } from "@components/PageComponents/Map/Popups/PopupWrapper.tsx";
import { useMapFitting } from "@core/hooks/useMapFitting";
import { useNodeDB } from "@core/stores";
import { hasPos, toLngLat } from "@core/utils/geo.ts";
import type { Protobuf } from "@meshtastic/core";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { MapRef } from "react-map-gl/maplibre";

export interface NodeMarkerProps {
  mapRef: MapRef | undefined;
  filteredNodes: Protobuf.Mesh.NodeInfo[];
  myNode: Protobuf.Mesh.NodeInfo | undefined;
  expandedCluster: string | undefined;
  setExpandedCluster: (key: string | undefined) => void;
  popupState: PopupState | undefined;
  setPopupState: (state: PopupState | undefined) => void;
  isVisible: boolean;
}

export const NodesLayer = ({
  mapRef,
  filteredNodes,
  myNode,
  expandedCluster,
  setExpandedCluster,
  popupState,
  setPopupState,
  isVisible,
}: NodeMarkerProps): React.ReactNode[] => {
  const { t } = useTranslation("map");

  const { hasNodeError } = useNodeDB();
  const { focusLngLat } = useMapFitting(mapRef);

  const selectedNode = useMemo(
    () =>
      popupState?.type !== "node"
        ? undefined
        : (filteredNodes.find((node) => node.num === popupState.num) ??
          undefined),
    [popupState, filteredNodes],
  );

  const onMarkerClick = useCallback(
    (num: number, offset: PxOffset, e: { originalEvent: MouseEvent }) => {
      e.originalEvent?.stopPropagation();
      setPopupState({ type: "node", num, offset });
      const node = filteredNodes.find((node) => node.num === num) ?? undefined;
      if (node) {
        focusLngLat(toLngLat(node.position));
      }
    },
    [filteredNodes, focusLngLat, setPopupState],
  );

  const clusters = groupNodesByIdenticalCoords(filteredNodes);
  const rendered: React.ReactNode[] = [];

  for (const [key, nodes] of clusters) {
    if (!nodes.length || !nodes[0]?.position) {
      continue;
    }
    const [lng, lat] = toLngLat(nodes[0].position);
    const isExpanded = expandedCluster === key;

    // Precompute pixel offsets for expanded state
    const expandedOffsets = isExpanded
      ? fanOutOffsetsPx(nodes.length, key)
      : undefined;

    // Always render all node markers in the cluster
    for (const [i, node] of nodes.entries()) {
      const isHead = i === 0;

      rendered.push(
        <NodeMarker
          key={`node-${key}-${node.num}`}
          id={node.num}
          lng={lng}
          lat={lat}
          offset={expandedOffsets?.[i]}
          label={node.user?.shortName ?? t("unknown.shortName")}
          tooltipLabel={node.user?.longName ?? t("unknown.longName")}
          hasError={hasNodeError(node.num)}
          isFavorite={node.isFavorite ?? false}
          isVisible={isVisible}
          onClick={(num, e) => {
            e.originalEvent?.stopPropagation();
            if (!isExpanded && !isHead) {
              // collapsed: tapping a buried marker expands the stack first
              setExpandedCluster(key);
              return;
            }
            onMarkerClick(num, expandedOffsets?.[i] ?? [0, 0], e);
          }}
        />,
      );
    }

    if (nodes.length > 1) {
      rendered.push(
        <StackBadge
          key={`stack-badge-${key}`}
          lng={lng}
          lat={lat}
          count={nodes.length - 1}
          isVisible={isVisible && !isExpanded}
          onClick={(e) => {
            e.originalEvent?.stopPropagation();
            setExpandedCluster(key);
          }}
        />,
      );
    }
  }

  if (selectedNode) {
    rendered.push(
      <SourcePrecisionCircles
        key={`precision-circles-selected-${selectedNode.num}`}
        data={generatePrecisionCircles([selectedNode])}
        id={`precisionCircles-selected-${selectedNode.num}`}
        isVisible={true}
      />,
    );

    const [lng, lat] = toLngLat(selectedNode.position);

    rendered.push(
      <PopupWrapper
        key={`popup-nodeinfo-${selectedNode.num}`}
        lng={lng}
        lat={lat}
        offset={popupState?.type === "node" ? popupState.offset : [0, 0]}
        onClose={() => setPopupState(undefined)}
      >
        <NodeDetail node={selectedNode} />
      </PopupWrapper>,
    );
  }

  if (myNode && hasPos(myNode.position)) {
    const [lng, lat] = toLngLat(myNode.position);
    rendered.push(
      <NodeMarker
        key={`node-${myNode.num}`}
        id={myNode.num}
        lng={lng}
        lat={lat}
        label={myNode.user?.shortName?.toString() ?? String(myNode.num)}
        tooltipLabel={t("myNode.tooltip")}
        hasError={false}
        isFavorite={true}
        onClick={(_, e) => onMarkerClick(myNode.num, [0, 0], e)}
      />,
    );
  }

  return rendered;
};
