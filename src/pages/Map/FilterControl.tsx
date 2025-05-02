import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/UI/Popover.tsx";
import { FunnelIcon } from "lucide-react";
import { Checkbox } from "@components/UI/Checkbox/index.tsx";
import { Slider } from "@components/UI/Slider.tsx";
import { ScrollArea } from "@components/UI/ScrollArea.tsx";
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from "@components/UI/Accordion.tsx";
import type {
  FilterConfig,
  FilterValueMap,
} from "@core/hooks/useNodeFilters.ts";
import { cn } from "@core/utils/cn.ts";
import { TimeAgo } from "@components/generic/TimeAgo.tsx";

interface FilterControlProps {
  groupedFilterConfigs: Record<string, FilterConfig[]>;
  values: FilterValueMap;
  onChange: <K extends keyof FilterValueMap>(
    key: K,
    value: FilterValueMap[K],
  ) => void;
  resetFilters: () => void;
  isDirty: boolean;
  children?: React.ReactNode;
}

export function FilterControl(
  { groupedFilterConfigs, values, onChange, resetFilters, isDirty, children }:
    FilterControlProps,
) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "fixed bottom-17 right-2 px-1 py-1 rounded shadow-md",
            isDirty
              ? " text-slate-100  bg-green-600 hover:bg-green-700 hover:text-slate-200 active:bg-green-800"
              : "text-slate-600  bg-slate-100 hover:bg-slate-200 hover:text-slate-700 active:bg-slate-300",
          )}
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
          <Accordion
            className="AccordionRoot"
            type="single"
            defaultValue={Object.entries(groupedFilterConfigs)[0][0]}
            collapsible
          >
            {Object.entries(groupedFilterConfigs).map((
              [groupName, groupConfigs],
            ) => (
              <AccordionItem key={groupName} value={groupName}>
                <AccordionHeader>
                  <AccordionTrigger className="w-full text-left font-bold text-sm px-1 py-2">
                    {groupName}
                  </AccordionTrigger>
                </AccordionHeader>
                <AccordionContent className="px-1 pb-4 pt-2 space-y-3">
                  {groupConfigs.map((cfg) => {
                    const val = values[cfg.key];
                    switch (cfg.type) {
                      case "boolean":
                        if (typeof val !== "boolean") return null;
                        return (
                          <Checkbox
                            key={cfg.key}
                            checked={val}
                            onChange={(v) => onChange(cfg.key, v)}
                            className="pb-1"
                            labelClassName="dark:text-slate-900"
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

                        let formattedMin = null;
                        let formattedMax = null;

                        // Some filters require special formatting for min/max values
                        if (cfg.key == "battery" && min == hi) {
                          formattedMin = "Charging";
                        }
                        if (cfg.key == "battery" && max == hi) {
                          formattedMax = "Charging";
                        }
                        if (cfg.key == "hopRange" && min == lo) {
                          formattedMin = "Direct";
                        }
                        if (cfg.key == "lastHeard") {
                          formattedMin = (
                            <>
                              <br />
                              {min === lo ? "now" : (
                                <TimeAgo
                                  timestamp={Date.now() - min * 1000}
                                />
                              )}
                            </>
                          );

                          formattedMax = (
                            <>
                              {max === hi ? ">" : ""}
                              <TimeAgo timestamp={Date.now() - max * 1000} />
                            </>
                          );
                        }

                        return (
                          <div key={cfg.key} className="space-y-2">
                            <label className="block text-sm font-medium">
                              {cfg.label}:{" "}
                              {min === max ? formattedMin ?? min : (
                                <>
                                  {formattedMin ?? min} – {formattedMax ?? max}
                                </>
                              )}
                            </label>
                            <Slider
                              value={[min, max]}
                              min={lo}
                              max={hi}
                              step={Number.isInteger(lo) ? 1 : 0.1}
                              onValueChange={(newRange) => {
                                const [newMin, newMax] = newRange;
                                onChange(cfg.key, [newMin, newMax]);
                              }}
                              className="w-full pb-3"
                              trackClassName="h-1 bg-slate-200 dark:bg-slate-700"
                              rangeClassName="bg-blue-500"
                              thumbClassName="w-3 h-3 bg-white border border-slate-400 dark:border-slate-600"
                              aria-label={`Slider - ${cfg.label}`}
                            />
                          </div>
                        );
                      }
                      case "multi": {
                        const safeArray = (() => {
                          if (!Array.isArray(val)) return [];
                          return val.filter((x): x is string =>
                            typeof x === "string"
                          );
                        })();

                        const allSelected = cfg.options.length > 0 &&
                          cfg.options.every((opt) => safeArray.includes(opt));

                        return (
                          <ScrollArea className="h-64 border rounded-md">
                            <div
                              key={cfg.key}
                              className="space-y-2 px-2 py-3"
                            >
                              <button
                                type="button"
                                className="w-full py-1 shadow-sm hover:shadow-md bg-slate-600 text-white rounded text-sm  hover:text-slate-100 hover:bg-slate-700 active:bg-slate-800"
                                onClick={() =>
                                  onChange(
                                    cfg.key,
                                    allSelected ? [] : [...cfg.options],
                                  )}
                              >
                                {allSelected ? "Uncheck All" : "Check All"}
                              </button>
                              {cfg.options.map((opt) => (
                                <Checkbox
                                  key={opt.replace(/ /g, "_")}
                                  checked={safeArray.includes(opt)}
                                  onChange={(checked) =>
                                    onChange(
                                      cfg.key,
                                      checked
                                        ? [...safeArray, opt]
                                        : safeArray.filter((s) => s !== opt),
                                    )}
                                >
                                  {opt}
                                </Checkbox>
                              ))}
                            </div>
                          </ScrollArea>
                        );
                      }
                      case "search":
                        if (typeof val !== "string") return null;
                        return (
                          <div
                            key={`${cfg.key}_div`}
                            className="flex flex-col space-y-1 pb-2"
                          >
                            <label
                              htmlFor={cfg.key}
                              className="font-medium text-sm"
                            >
                              {cfg.label}
                            </label>
                            <input
                              id={cfg.key}
                              type="text"
                              value={val}
                              onChange={(e) =>
                                onChange(cfg.key, e.target.value)}
                              placeholder="Search phrase"
                              className="w-full px-2 py-1 border rounded shadow-sm dark:bg-slate-200 dark:border-slate-600"
                            />
                          </div>
                        );

                      default:
                        return null;
                    }
                  })}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <button
            type="button"
            onClick={resetFilters}
            className="w-full py-1 shadow-sm hover:shadow-md bg-slate-600 text-white rounded text-sm  hover:text-slate-100 hover:bg-slate-700 active:bg-slate-800"
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
