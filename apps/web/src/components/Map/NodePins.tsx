import { NodeAvatar } from "@components/UI/NodeAvatar.tsx";
import {
  type MapPin,
  type MapStack,
  type PinTone,
  showPinLabel,
} from "@core/nodes/mapPins.ts";
import type { NodeRow } from "@core/nodes/nodeRow.ts";
import { cn } from "@core/utils/cn.ts";
import { StarIcon } from "lucide-react";
import { memo, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Marker, type MarkerEvent } from "react-map-gl/maplibre";

const toneRing: Record<PinTone, string> = {
  selected: "border-accent",
  self: "border-device-avatar",
  default: "border-control",
};

/** Border (2px) + padding (3px) + half the xs avatar's 44px minimum width. */
const AVATAR_CENTER_PX = 27;

/** Stops a marker click reaching the map, whose click clears the selection. */
const swallow = (event: MarkerEvent<MouseEvent>) => {
  event.originalEvent.stopPropagation();
};

/** Only primitives, so `memo` can skip pins whose node didn't change. */
interface PinProps {
  num: number;
  lng: number;
  lat: number;
  dx: number;
  dy: number;
  name: string;
  initials: string;
  isFavorite: boolean;
  isSelf: boolean;
  isSelected: boolean;
  tone: PinTone;
  withLabel: boolean;
  /** Not matching the list search: drawn faded. */
  dimmed: boolean;
  onSelect: (num: number) => void;
}

const Pin = memo(function Pin({
  num,
  lng,
  lat,
  dx,
  dy,
  name,
  initials,
  isFavorite,
  isSelf,
  isSelected,
  tone,
  withLabel,
  dimmed,
  onSelect,
}: PinProps) {
  return (
    <Marker
      longitude={lng}
      latitude={lat}
      // Left-anchored so the avatar, not the whole pill, sits on the point
      // whether or not the name is showing.
      anchor="left"
      offset={[dx - AVATAR_CENTER_PX, dy]}
      style={{ zIndex: isSelected ? 2 : isSelf ? 1 : 0 }}
      onClick={(event) => {
        swallow(event);
        onSelect(num);
      }}
    >
      {/* Out of the tab order: the node list is the keyboard path. */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={name}
        aria-pressed={isSelected}
        className={cn(
          // Squircle ring concentric with the avatar: its 8px corner plus the
          // 3px padding and 2px border.
          "relative flex cursor-pointer items-center gap-1.5 rounded-avatar border-2 bg-surface p-[3px] [--avatar-r:13px] pointer-coarse:touch-target text-meta font-medium text-primary shadow-floating transition-opacity",
          withLabel && "pr-2.5",
          dimmed && "opacity-40",
          toneRing[tone],
        )}
      >
        <NodeAvatar
          initials={initials}
          tone={isSelf ? { kind: "device" } : { kind: "node", nodeNum: num }}
          size="xs"
        >
          {isFavorite ? (
            <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-surface text-warning">
              <StarIcon aria-hidden="true" className="size-2.5 fill-current" />
            </span>
          ) : null}
        </NodeAvatar>
        {withLabel ? (
          <span aria-hidden="true" className="max-w-40 truncate">
            {name}
          </span>
        ) : null}
      </button>
    </Marker>
  );
});

interface StackProps {
  clusterKey: string;
  lng: number;
  lat: number;
  hiddenCount: number;
  onExpand: (key: string) => void;
}

const StackBadge = memo(function StackBadge({
  clusterKey,
  lng,
  lat,
  hiddenCount,
  onExpand,
}: StackProps) {
  const { t } = useTranslation("map");
  return (
    <Marker
      longitude={lng}
      latitude={lat}
      anchor="center"
      offset={[20, -20]}
      style={{ zIndex: 3 }}
      onClick={(event) => {
        swallow(event);
        onExpand(clusterKey);
      }}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label={t("pins.expandStack", { count: hiddenCount })}
        className="relative cursor-pointer rounded-full bg-accent px-2 py-0.5 pointer-coarse:touch-target text-meta font-bold text-on-accent shadow-floating"
      >
        +{hiddenCount}
      </button>
    </Marker>
  );
});

/** A callback whose identity never changes but always calls the latest `fn`. */
function useStableCallback<A extends unknown[]>(
  fn: (...args: A) => void,
): (...args: A) => void {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  }, [fn]);
  return useCallback((...args: A) => ref.current(...args), []);
}

export interface NodePinsProps {
  pins: readonly MapPin[];
  stacks: readonly MapStack[];
  rowsByNum: ReadonlyMap<number, NodeRow>;
  /** Past the zoom where every pin shows its name. */
  zoomedIn: boolean;
  /** Nodes matching the list search; others are faded. All when undefined. */
  matchingNums?: ReadonlySet<number>;
  onSelect: (num: number) => void;
  onExpandStack: (key: string) => void;
}

/**
 * Avatar pins for nodes with a position, and "+N" badges on stacks.
 *
 * DOM markers keep pins as real buttons with the avatar styling. They stay
 * smooth up to roughly `DOM_PIN_SOFT_LIMIT` (300) pins; a node DB much
 * larger than that would call for a GeoJSON symbol layer instead.
 */
export const NodePins = ({
  pins,
  stacks,
  rowsByNum,
  zoomedIn,
  matchingNums,
  onSelect,
  onExpandStack,
}: NodePinsProps) => {
  const select = useStableCallback(onSelect);
  const expand = useStableCallback(onExpandStack);
  return (
    <>
      {pins.map((pin) => {
        const row = rowsByNum.get(pin.num);
        if (!row) {
          return null;
        }
        return (
          <Pin
            key={`${pin.clusterKey}-${pin.num}`}
            num={pin.num}
            lng={pin.lngLat[0]}
            lat={pin.lngLat[1]}
            dx={pin.offsetPx[0]}
            dy={pin.offsetPx[1]}
            name={row.name}
            initials={row.initials}
            isFavorite={row.isFavorite}
            isSelf={pin.isSelf}
            isSelected={pin.isSelected}
            tone={pin.tone}
            withLabel={showPinLabel(pin, zoomedIn)}
            dimmed={matchingNums !== undefined && !matchingNums.has(pin.num)}
            onSelect={select}
          />
        );
      })}
      {stacks.map((stack) => (
        <StackBadge
          key={`stack-${stack.clusterKey}`}
          clusterKey={stack.clusterKey}
          lng={stack.lngLat[0]}
          lat={stack.lngLat[1]}
          hiddenCount={stack.hiddenCount}
          onExpand={expand}
        />
      ))}
    </>
  );
};
