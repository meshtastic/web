import { Checkbox } from "@components/UI/Checkbox/index.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/UI/Popover.tsx";
import { cn } from "@core/utils/cn.ts";
import { LayersIcon } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { useTranslation } from "react-i18next";

export interface VisibilityState {
  nodeMarkers: boolean;
  directNeighbors: boolean;
  remoteNeighbors: boolean;
  positionPrecision: boolean;
  traceroutes: boolean;
  waypoints: boolean;
}

export const defaultVisibilityState: VisibilityState = {
  nodeMarkers: true,
  directNeighbors: false,
  remoteNeighbors: false,
  positionPrecision: false,
  traceroutes: false,
  waypoints: true,
};

interface MapLayerToolProps {
  visibilityState: VisibilityState;
  setVisibilityState: (state: VisibilityState) => void;
}

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

const CheckboxItem = ({
  label,
  checked,
  onChange,
  className,
}: CheckboxProps) => {
  return (
    <Checkbox
      checked={checked}
      onChange={onChange}
      className={cn("flex items-center gap-2", className)}
    >
      <span className="dark:text-slate-200">{label}</span>
    </Checkbox>
  );
};

export function MapLayerTool({
  visibilityState,
  setVisibilityState,
}: MapLayerToolProps): ReactNode {
  const { t } = useTranslation("map");

  const enabledCount = useMemo(() => {
    return Object.values(visibilityState).filter(Boolean).length;
  }, [visibilityState]);

  const handleCheckboxChange = (key: keyof VisibilityState) => {
    setVisibilityState({
      ...visibilityState,
      [key]: !visibilityState[key],
    });
  };

  const layers = useMemo(
    () => [
      { key: "nodeMarkers", label: t("layerTool.nodeMarkers") },
      { key: "waypoints", label: t("layerTool.waypoints") },
      { key: "directNeighbors", label: t("layerTool.directNeighbors") },
      { key: "remoteNeighbors", label: t("layerTool.remoteNeighbors") },
      { key: "positionPrecision", label: t("layerTool.positionPrecision") },
      // { key: "traceroutes", label: t("layerTool.traceroutes") },
    ],
    [t],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative rounded align-center",
            "w-[29px] px-1 py-1 shadow-l outline-[2px] outline-stone-600/20",
            "bg-stone-50 hover:bg-stone-200 dark:bg-stone-200 dark:hover:bg-stone-300 ",
            "text-slate-600 hover:text-slate-700 active:bg-slate-300",
            "dark:text-slate-600 hover:dark:text-slate-700",
          )}
          aria-label={t("mapMenu.layersAria")}
        >
          <LayersIcon className="w-[21px]" />
          {enabledCount > 0 && (
            <span
              className={cn(
                "absolute -bottom-2 -right-2",
                "min-w-4 h-4 px-[3px]",
                "rounded-full text-[10px] leading-4",
                "bg-blue-500 text-white",
                "flex items-center justify-center",
                "ring-2 ring-white dark:ring-stone-200",
              )}
              aria-hidden="true"
            >
              {enabledCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("dark:text-slate-300 flex flex-col space-y-2 py-4")}
        side={"bottom"}
        align="end"
        sideOffset={7}
      >
        {layers.map(({ key, label }) => (
          <CheckboxItem
            key={key}
            label={label}
            checked={visibilityState[key as keyof VisibilityState]}
            onChange={() => handleCheckboxChange(key as keyof VisibilityState)}
          />
        ))}
        {/*<CheckboxItem
          key="traceroutes"
          label={t("layerTool.traceroutes")}
          checked={visibilityState.traceroutes}
          onChange={(checked) => {
            setVisibilityState({ ...visibilityState, traceroutes: checked });
          }}
        />*/}
      </PopoverContent>
    </Popover>
  );
}
