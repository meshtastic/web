import { Checkbox } from "@components/UI/Checkbox/index.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/UI/Popover.tsx";
import { cn } from "@core/utils/cn.ts";
import { LayersIcon } from "lucide-react";
import type { ReactNode } from "react";
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "rounded align-center",
            "w-[29px] px-1 py-1 shadow-l outline-[2px] outline-stone-600/20",
            "bg-stone-50 hover:bg-stone-200 dark:bg-stone-200 dark:hover:bg-stone-300 ",
            "text-slate-600 hover:text-slate-700 active:bg-slate-300",
            "dark:text-slate-600 hover:dark:text-slate-700",
          )}
          aria-label={t("mapMenu.layersAria")}
        >
          <LayersIcon className="w-[21px]" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("dark:text-slate-300 flex flex-col space-y-2 py-4")}
        side={"bottom"}
        align="end"
        sideOffset={7}
      >
        <CheckboxItem
          label={t("layerTool.nodeMarkers")}
          checked={visibilityState.nodeMarkers}
          onChange={(checked) => {
            setVisibilityState({ ...visibilityState, nodeMarkers: checked });
          }}
        />
        <CheckboxItem
          label={t("layerTool.waypoints")}
          checked={visibilityState.waypoints}
          onChange={(checked) => {
            setVisibilityState({ ...visibilityState, waypoints: checked });
          }}
        />
        <CheckboxItem
          label={t("layerTool.directNeighbors")}
          checked={visibilityState.directNeighbors}
          onChange={(checked) => {
            setVisibilityState({
              ...visibilityState,
              directNeighbors: checked,
            });
          }}
        />
        <CheckboxItem
          label={t("layerTool.remoteNeighbors")}
          checked={visibilityState.remoteNeighbors}
          onChange={(checked) => {
            setVisibilityState({
              ...visibilityState,
              remoteNeighbors: checked,
            });
          }}
        />
        <CheckboxItem
          label={t("layerTool.positionPrecision")}
          checked={visibilityState.positionPrecision}
          onChange={(checked) => {
            setVisibilityState({
              ...visibilityState,
              positionPrecision: checked,
            });
          }}
        />
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
