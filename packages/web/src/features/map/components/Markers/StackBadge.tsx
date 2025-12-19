import { Marker } from "react-map-gl/maplibre";

type StackBadgeProps = {
  lng: number;
  lat: number;
  count: number; // n = size-1
  isVisible?: boolean;
  onClick: (e: { originalEvent: MouseEvent }) => void;
};

export const StackBadge = ({
  lng,
  lat,
  count,
  isVisible = true,
  onClick,
}: StackBadgeProps) => {
  return (
    <Marker
      longitude={lng}
      latitude={lat}
      style={{ left: 18, top: -18, display: isVisible ? "" : "none" }}
    >
      <button
        onClick={(e) => onClick({ originalEvent: e.nativeEvent })}
        className="rounded-full bg-blue-600 text-white text-xs px-2 py-0.5 shadow ring-1 ring-black/20 active:bg-red-800"
        type={"button"}
      >
        +{count}
      </button>
    </Marker>
  );
};
