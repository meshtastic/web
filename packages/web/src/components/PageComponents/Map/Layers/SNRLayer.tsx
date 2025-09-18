import { Mono } from "@app/components/generic/Mono";
import { cn } from "@app/core/utils/cn";
import { getSignalColor } from "@app/core/utils/signalColor";
import type { VisibilityState } from "@components/PageComponents/Map/Tools/MapLayerTool";
import { useDevice } from "@core/stores";
import {
  distanceMeters,
  hasPos,
  type LngLat,
  lngLatToMercator,
  mercatorToLngLat,
  toLngLat,
} from "@core/utils/geo";
import type { Protobuf } from "@meshtastic/core";
import type { Feature, FeatureCollection } from "geojson";
import { useTranslation } from "react-i18next";
import { Layer, Source } from "react-map-gl/maplibre";

const ARC_SEGMENTS = 32;
const ARC_OFFSET = 0.01; // 1% of distance
const MIN_LEN = 1e-3; // meters

export interface SNRLayerProps {
  id: string;
  filteredNodes: Protobuf.Mesh.NodeInfo[];
  myNode: Protobuf.Mesh.NodeInfo | undefined;
  visibilityState: VisibilityState;
}

export interface SNRTooltipProps {
  pos: { x: number; y: number };
  snr: number;
  from: string;
  to: string;
}

type NeighborPlus = Protobuf.Mesh.Neighbor & {
  num: number | undefined;
  position: Protobuf.Mesh.Position | undefined;
};
type NeighborInfoPlus = Omit<Protobuf.Mesh.NeighborInfo, "neighbors"> & {
  neighbors: NeighborPlus[];
};

type RemoteInfo = {
  type: "remote";
  node: Protobuf.Mesh.NodeInfo;
  neighborInfo: NeighborInfoPlus;
};

type DirectInfo = {
  type: "direct";
  from: Protobuf.Mesh.NodeInfo;
  to: Protobuf.Mesh.NodeInfo;
  snr: number;
};

type NeighborInfos = RemoteInfo | DirectInfo;

type Pair = {
  a: number;
  b: number;
  ab?: number; // SNR a->b
  ba?: number; // SNR b->a
};

function arcSegment(
  aLngLat: LngLat,
  bLngLat: LngLat,
  curved: boolean,
): LngLat[] | undefined {
  if (!curved && distanceMeters(aLngLat, bLngLat) < MIN_LEN) {
    // Straight line
    return [aLngLat, bLngLat];
  }
  const [ax, ay] = lngLatToMercator(aLngLat);
  const [bx, by] = lngLatToMercator(bLngLat);

  const dx = bx - ax,
    dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < MIN_LEN) {
    return undefined;
  }

  const offsetMeters = curved ? len * ARC_OFFSET : 0;

  // Unit direction A->B and its left-hand normal
  const ux = dx / len,
    uy = dy / len;
  const nx = -uy,
    ny = ux;

  // Control point at the midpoint, offset to the left by offsetMeters
  const mx = (ax + bx) * 0.5,
    my = (ay + by) * 0.5;
  const cx = mx + nx * offsetMeters,
    cy = my + ny * offsetMeters;

  const coords: LngLat[] = [];
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    const t = i / ARC_SEGMENTS;
    const omt = 1 - t;
    // Quadratic Bézier: B(t) = (1−t)^2*A + 2(1−t)t*C + t^2*B
    const x = omt * omt * ax + 2 * omt * t * cx + t * t * bx;
    const y = omt * omt * ay + 2 * omt * t * cy + t * t * by;
    coords.push(mercatorToLngLat([x, y]));
  }
  return coords;
}

function upsertPair(
  fromId: number,
  toId: number,
  snr: number,
  pairs: Map<string, Pair>,
  idToLngLat: Map<number, LngLat>,
): void {
  if (fromId === toId || !idToLngLat.has(fromId) || !idToLngLat.has(toId)) {
    return;
  }

  const a = Math.min(fromId, toId);
  const b = Math.max(fromId, toId);
  const key = `${a}-${b}`;

  let pair = pairs.get(key); // pair might exist
  if (!pair) {
    pair = { a, b };
  }

  // Store best SNR for each direction
  if (fromId === a) {
    pair.ab = pair.ab && pair.ab > snr ? pair.ab : snr;
  } else {
    pair.ba = pair.ba && pair.ba > snr ? pair.ba : snr;
  }

  pairs.set(key, pair);
}

function makeFeature(
  fromId: number,
  toId: number,
  fromPos: LngLat,
  toPos: LngLat,
  snr: number,
  curved: boolean,
): Feature | undefined {
  const segment = arcSegment(fromPos, toPos, curved);

  if (!segment) {
    return undefined;
  }

  return {
    type: "Feature",
    geometry: { type: "LineString", coordinates: segment },
    properties: {
      color: getSignalColor(snr),
      snr,
      from: fromId,
      to: toId,
    },
  };
}

function pushIfFeature(
  a: number,
  b: number,
  aPos: LngLat,
  bPos: LngLat,
  snr: number,
  curved: boolean,
  features: Feature[],
) {
  const feat = makeFeature(a, b, aPos, bPos, snr, curved);
  if (feat) {
    features.push(feat);
  }
}

function generateNeighborLines(
  neighborInfos: NeighborInfos[],
): FeatureCollection {
  // Collect positions for all referenced nodes, discard pairs with missing positions
  const idToLngLat = new Map<number, LngLat>();
  const ensure = (node?: Protobuf.Mesh.NodeInfo | NeighborPlus) => {
    if (node?.num && hasPos(node.position) && !idToLngLat.has(node.num)) {
      idToLngLat.set(node.num, toLngLat(node.position));
    }
  };

  for (const info of neighborInfos) {
    if (info.type === "remote") {
      ensure(info.node);
      for (const neighbor of info.neighborInfo.neighbors) {
        ensure(neighbor);
      }
    } else {
      ensure(info.from);
      ensure(info.to);
    }
  }

  // Coalesce into pairs
  const pairs = new Map<string, Pair>();
  for (const info of neighborInfos) {
    if (info.type === "remote") {
      // RemoteInfo object
      const fromId = info.node.num;
      for (const neighbor of info.neighborInfo.neighbors) {
        upsertPair(fromId, neighbor.nodeId, neighbor.snr, pairs, idToLngLat);
      }
    } else {
      // DirectInfo object
      upsertPair(info.from.num, info.to.num, info.snr, pairs, idToLngLat);
    }
  }

  // Generate features
  const features: Feature[] = [];

  for (const pair of pairs.values()) {
    const aPos = idToLngLat.get(pair.a);
    const bPos = idToLngLat.get(pair.b);
    if (!aPos || !bPos) {
      continue;
    }

    if (pair.ab && pair.ba) {
      // both directions → two arcs
      pushIfFeature(pair.a, pair.b, aPos, bPos, pair.ab, true, features);
      pushIfFeature(pair.b, pair.a, bPos, aPos, pair.ba, true, features);
    } else {
      // only one direction → straight
      if (pair.ab) {
        pushIfFeature(pair.a, pair.b, aPos, bPos, pair.ab, false, features);
      }
      if (pair.ba) {
        pushIfFeature(pair.b, pair.a, bPos, aPos, pair.ba, false, features);
      }
    }
  }

  return { type: "FeatureCollection", features };
}

export const SNRTooltip = ({
  pos,
  snr,
  from,
  to,
}: Partial<SNRTooltipProps> = {}) => {
  const { t } = useTranslation();

  if (!pos) {
    return undefined;
  }
  return (
    <div
      className={cn(
        "absolute block p-2 px-3 text-sm bg-white dark:bg-slate-800 rounded-lg shadow",
        "",
      )}
      style={{ left: `${pos.x + 5}px`, top: `${pos.y + 10}px` }}
      aria-hidden={!pos}
    >
      <div>
        <strong className="font-bold">{from ?? ""}</strong>
        <span className="mx-1">⭢</span>
        <strong className="font-bold">{to ?? ""}</strong>
      </div>
      <div>
        SNR: <Mono>{snr?.toFixed?.(2) ?? t("unknown.shortName")}</Mono> dB
      </div>
    </div>
  );
};

export const SNRLayer = ({
  id,
  filteredNodes,
  myNode,
  visibilityState,
}: SNRLayerProps): React.ReactNode => {
  const { getNeighborInfo } = useDevice();

  const remotePairs = visibilityState.remoteNeighbors
    ? filteredNodes.flatMap((node) => {
        const neighborInfo = getNeighborInfo(node.num);
        return neighborInfo
          ? [
              {
                type: "remote" as const,
                node,
                neighborInfo: {
                  ...neighborInfo,
                  neighbors: neighborInfo.neighbors.map((n) => {
                    const node = filteredNodes.find(
                      (node) => node.num === n.nodeId,
                    );
                    return { ...n, num: node?.num, position: node?.position };
                  }),
                },
              } as const,
            ]
          : [];
      })
    : [];

  const directPairs =
    visibilityState.directNeighbors && myNode
      ? filteredNodes
          .filter((node) => node.hopsAway === 0 && node.num !== myNode.num)
          .map((to) => ({
            type: "direct" as const,
            from: myNode,
            to,
            snr: to.snr ?? 0,
          }))
      : [];

  const featureCollection = generateNeighborLines([
    ...remotePairs,
    ...directPairs,
  ]);

  return (
    <Source type="geojson" data={featureCollection}>
      <Layer
        id={id}
        type="line"
        paint={{
          "line-color": ["get", "color"],
          "line-width": 5,
        }}
      />
    </Source>
  );
};
