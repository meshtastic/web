import type { HeatmapMode } from "@components/PageComponents/Map/Layers/HeatmapLayer.tsx";
import { Segmented } from "@components/UI/Segmented.tsx";
import {
  MAP_LAYER_KEYS,
  type MapLayerKey,
  type VisibilityState,
} from "@core/nodes/mapLayers.ts";
import { cn } from "@core/utils/cn.ts";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export interface LayersControlProps {
  visibility: VisibilityState;
  onToggle: (key: MapLayerKey) => void;
  heatmapMode: HeatmapMode;
  onHeatmapModeChange: (mode: HeatmapMode) => void;
  className?: string;
}

/** Checkboxes for the map overlays, plus the heatmap's mode when it is on. */
export const LayersControl = ({
  visibility,
  onToggle,
  heatmapMode,
  onHeatmapModeChange,
  className,
}: LayersControlProps) => {
  const { t } = useTranslation("map");
  const headingId = useId();
  return (
    <fieldset
      aria-labelledby={headingId}
      className={cn(
        "m-0 flex min-w-0 flex-col gap-2 rounded-panel border border-control bg-surface p-3 text-primary",
        className,
      )}
    >
      <h2
        id={headingId}
        className="m-0 mb-0.5 text-meta font-semibold tracking-[0.06em] text-muted uppercase"
      >
        {t("layers.title")}
      </h2>
      {MAP_LAYER_KEYS.map((key) => (
        <label
          key={key}
          className="flex min-h-6 cursor-pointer items-center gap-2 text-help"
        >
          <input
            type="checkbox"
            checked={visibility[key]}
            onChange={() => onToggle(key)}
            className="size-4 cursor-pointer accent-accent"
          />
          {t(`layers.${key}`)}
        </label>
      ))}
      {visibility.heatmap ? (
        <Segmented
          aria-label={t("layers.heatmapMode")}
          size="sm"
          options={[
            { value: "density", label: t("layers.density") },
            { value: "snr", label: t("layers.snr") },
          ]}
          value={heatmapMode}
          onValueChange={onHeatmapModeChange}
          className="ml-6 self-start"
        />
      ) : null}
    </fieldset>
  );
};
