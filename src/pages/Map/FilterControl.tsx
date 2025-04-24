import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/UI/Popover.tsx";
import { FunnelIcon } from "lucide-react";
import { Checkbox } from "@components/UI/Checkbox/index.tsx";
import { Slider } from "@components/UI/Slider.tsx";
import type {
  FilterConfig,
  FilterValueMap,
} from "@core/hooks/useNodeFilters.ts";

interface FilterControlProps {
  configs: FilterConfig[];
  values: FilterValueMap;
  onChange: <K extends keyof FilterValueMap>(
    key: K,
    value: FilterValueMap[K],
  ) => void;
  resetFilters: () => void;
  children?: React.ReactNode;
}

export function FilterControl(
  { configs, values, onChange, resetFilters, children }: FilterControlProps,
) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="fixed bottom-17 right-2 px-1 py-1 bg-slate-100  text-slate-600 rounded shadow-md"
          aria-label="Filter"
        >
          <FunnelIcon />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={12}
        className="dark:bg-slate-100 dark:border-slate-300"
      >
        <div className="space-y-4">
          {configs.map((cfg) => {
            const val = values[cfg.key];
            switch (cfg.type) {
              case "boolean":
                if (typeof val !== "boolean") return null;
                return (
                  <Checkbox
                    key={cfg.key}
                    checked={val}
                    onChange={(v) => onChange(cfg.key, v)}
                    labelClassName="dark:text-gray-900"
                  >
                    {cfg.label}
                  </Checkbox>
                );
              case "range": {
                if (
                  !Array.isArray(val) ||
                  val.length !== 2 ||
                  typeof val[0] !== "number" ||
                  typeof val[1] !== "number"
                ) {
                  return null;
                }
                const [min, max] = val;
                const [lo, hi] = cfg.bounds;
                return (
                  <div key={cfg.key} className="space-y-2">
                    <label className="block text-sm font-medium">
                      {cfg.label}: {min} – {max}
                    </label>
                    <Slider
                      value={[min, max]}
                      min={lo}
                      max={hi}
                      step={1}
                      onValueChange={(newRange) => {
                        const [newMin, newMax] = newRange;
                        onChange(cfg.key, [newMin, newMax]);
                      }}
                      className="w-full"
                      trackClassName="h-1 bg-gray-200 dark:bg-slate-700"
                      rangeClassName="bg-blue-500"
                      thumbClassName="w-3 h-3 bg-white border border-gray-400 dark:border-slate-600"
                      aria-label={`Slider - ${cfg.label}`}
                    />
                  </div>
                );
              }
              case "search":
                if (typeof val !== "string") return null;
                return (
                  <div key={cfg.key} className="flex flex-col space-y-1">
                    <label htmlFor={cfg.key} className="font-medium text-sm">
                      {cfg.label}
                    </label>
                    <input
                      id={cfg.key}
                      type="text"
                      value={val}
                      onChange={(e) => onChange(cfg.key, e.target.value)}
                      placeholder="Search phrase"
                      className="w-full px-2 py-1 border rounded shadow-sm dark:bg-slate-200 dark:border-slate-600"
                    />
                  </div>
                );

              default:
                return null;
            }
          })}

          <button
            type="button"
            onClick={resetFilters}
            className="w-full py-1 bg-slate-600 text-white rounded text-sm"
          >
            Reset Filters
          </button>

          {children && (
            <div className="mt-4 border-t pt-4">
              {children}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
