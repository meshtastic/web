import type { Node } from "@data/schema";
import { useMapFitting } from "@shared/hooks/useMapFitting.ts";
import { hasNodePosition, toLngLatFromNode } from "@shared/utils/geo.ts";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { MapRef } from "react-map-gl/maplibre";
import {
  fanOutOffsetsPx,
  groupNodesByIdenticalCoords,
  type PxOffset,
} from "../cluster.ts";
import {
  generatePrecisionCircles,
  SourcePrecisionCircles,
} from "../Layers/PrecisionLayer.tsx";
import { NodeMarker } from "../Markers/NodeMarker.tsx";
import { StackBadge } from "../Markers/StackBadge.tsx";
import type { PopupState } from "../Popups/PopupWrapper.tsx";
import { PopupWrapper } from "../Popups/PopupWrapper.tsx";

export interface NodeMarkerProps {
  mapRef: MapRef | undefined;
  filteredNodes: Node[];
  myNode: Node | undefined;
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

  // Node error tracking has been removed from the node database
  const hasNodeError = (_nodeNum: number) => false;
  const { focusLngLat } = useMapFitting(mapRef);

  const selectedNode = useMemo(
    () =>
      popupState?.type !== "node"
        ? undefined
        : (filteredNodes.find((node) => node.nodeNum === popupState.num) ??
          undefined),
    [popupState, filteredNodes],
  );

  const onMarkerClick = useCallback(
    (num: number, offset: PxOffset, e: { originalEvent: MouseEvent }) => {
      e.originalEvent?.stopPropagation();
      setPopupState({ type: "node", num, offset });
      const node = filteredNodes.find((node) => node.nodeNum === num) ?? undefined;
      if (node && hasNodePosition(node)) {
        focusLngLat(toLngLatFromNode(node));
      }
    },
    [filteredNodes, focusLngLat, setPopupState],
  );

  const clusters = groupNodesByIdenticalCoords(filteredNodes);
  const rendered: React.ReactNode[] = [];

  for (const [key, nodes] of clusters) {
    const firstNode = nodes[0];
    if (!firstNode || !hasNodePosition(firstNode)) {
      continue;
    }
    const [lng, lat] = toLngLatFromNode(firstNode);
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
          key={`node-${key}-${node.nodeNum}`}
          id={node.nodeNum}
          lng={lng}
          lat={lat}
          offset={expandedOffsets?.[i]}
          label={node.shortName || t("unknown.shortName")}
          tooltipLabel={node.longName || t("unknown.longName")}
          hasError={hasNodeError(node.nodeNum)}
          isFavorite={node.isFavorite}
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
        key={`precision-circles-selected-${selectedNode.nodeNum}`}
        data={generatePrecisionCircles([selectedNode])}
        id={`precisionCircles-selected-${selectedNode.nodeNum}`}
        isVisible={true}
      />,
    );

    const [lng, lat] = toLngLatFromNode(selectedNode);

    rendered.push(
      <PopupWrapper
        key={`popup-nodeinfo-${selectedNode.nodeNum}`}
        lng={lng}
        lat={lat}
        offset={popupState?.type === "node" ? popupState.offset : [0, 0]}
        onClose={() => setPopupState(undefined)}
      >
        <span>TODO</span>
      </PopupWrapper>,
    );
  }

  if (myNode && hasNodePosition(myNode)) {
    const [lng, lat] = toLngLatFromNode(myNode);
    rendered.push(
      <NodeMarker
        key={`node-${myNode.nodeNum}`}
        id={myNode.nodeNum}
        lng={lng}
        lat={lat}
        label={myNode.shortName || String(myNode.nodeNum)}
        tooltipLabel={t("myNode.tooltip")}
        hasError={false}
        isFavorite={true}
        onClick={(_, e) => onMarkerClick(myNode.nodeNum, [0, 0], e)}
      />,
    );
  }

  return rendered;
};
