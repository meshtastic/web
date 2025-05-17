import { Protobuf } from "@meshtastic/core";
import { debounce } from "@core/utils/debounce.ts";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/UI/Popover.tsx";
import { Accordion } from "@components/UI/Accordion.tsx";
import { cn } from "@core/utils/cn.ts";
import { TimeAgo } from "@components/generic/TimeAgo.tsx";
import type { FilterState } from "@core/hooks/useFilterNode.ts";
import { FunnelIcon } from "lucide-react";
import { type ComponentProps, ReactNode } from "react";
import {
  FilterAccordionItem,
  FilterMulti,
  FilterSlider,
  FilterToggle,
} from "@components/generic/Filter/FilterComponents.tsx";

type PopoverContentProps = ComponentProps<typeof PopoverContent>;

interface FilterControlProps {
  filterState: FilterState;
  defaultFilterValues: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  isDirty?: boolean;
  parameters?: {
    popoverContentProps?: Partial<PopoverContentProps>;
    triggerIcon?: ReactNode;
    popoverTriggerClassName?: string;
    showTextSearch?: boolean;
  };

  children?: ReactNode;
}

export function FilterControl({
  filterState,
  defaultFilterValues,
  setFilterState,
  isDirty,
  parameters,
  children,
}: FilterControlProps) {
  const handleTextChange =
    <K extends keyof FilterState>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilterState((prev) => ({
        ...prev,
        [key]: e.target.value,
      }));
    };
  const handleRangeChange =
    <K extends keyof FilterState>(key: K) => (value: number[]) => {
      setFilterState((prev) => ({
        ...prev,
        [key]: value,
      }));
    };
  const handleBoolChange = <K extends keyof FilterState>(
    key: K,
    value: string,
  ) => {
    const typedValue = value === ""
      ? undefined
      : JSON.parse(value.toLowerCase());

    setFilterState((prev) => ({
      ...prev,
      [key]: typedValue,
    }));
  };

  const resetFilters = () => {
    setFilterState(defaultFilterValues);
  };

  function formatTS(ts: number): ReactNode {
    return <TimeAgo timestamp={Date.now() - ts * 1000} />;
  }
  function formatEnumLabel(label: string): string {
    return label.replace(/_/g, " ");
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "rounded",
            "text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300",
            "dark:text-slate-400 hover:dark:text-slate-400 dark:bg-slate-700 hover:dark:bg-slate-800 dark:active:bg-slate-950",
            isDirty
              ? "text-slate-100 dark:text-slate-300 bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-800 hover:text-slate-200 dark:hover:text-slate-300 active:bg-green-800 dark:active:bg-green-900"
              : "",
            parameters?.popoverTriggerClassName,
          )}
          aria-label="Filter"
        >
          {parameters?.triggerIcon ?? <FunnelIcon />}
        </button>
      </PopoverTrigger>
      <PopoverContent
        {...parameters?.popoverContentProps}
        className={cn(
          "dark:text-slate-300",
          parameters?.popoverContentProps?.className,
        )}
      >
        <form className="space-y-4">
          <Accordion
            type="single"
            defaultValue="General"
            collapsible
          >
            <FilterAccordionItem label="General">
              {(parameters?.showTextSearch ?? true) && (
                <div className="flex flex-col space-y-1 pb-2">
                  <label htmlFor="nodeName" className="font-medium text-sm">
                    Node name/number
                  </label>
                  <input
                    type="text"
                    value={filterState.nodeName}
                    onChange={handleTextChange("nodeName")}
                    placeholder="Search phrase"
                    className="w-full px-2 py-1 border rounded shadow-sm  dark:border-slate-600"
                  />
                </div>
              )}

              <FilterSlider
                label="Number of hops"
                filterKey="hopsAway"
                filterState={filterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
                labelContent={
                  <>
                    Number of hops: {filterState.hopsAway[0] === 0
                      ? "Direct"
                      : filterState.hopsAway[0]}
                    {filterState.hopsAway[0] !== filterState.hopsAway[1]
                      ? " - " + filterState.hopsAway[1]
                      : ""}
                  </>
                }
              />

              <FilterSlider
                label="Last heard"
                filterKey="lastHeard"
                filterState={filterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
                labelContent={
                  <>
                    Last heard: <br />
                    {filterState.lastHeard[0] === 0 ? "Now" : (
                      <>
                        {filterState.lastHeard[0] ===
                            defaultFilterValues.lastHeard[1] && ">"}
                        {formatTS(filterState.lastHeard[0])}
                      </>
                    )}
                    {filterState.lastHeard[0] !== filterState.lastHeard[1] && (
                      <>
                        {" – "}
                        {filterState.lastHeard[1] ===
                            defaultFilterValues.lastHeard[1] && ">"}
                        {formatTS(filterState.lastHeard[1])}
                      </>
                    )}
                  </>
                }
              />
              <FilterToggle
                label="Favorites"
                filterKey="isFavorite"
                alternativeLabels={["Hide", "Show Only"]}
                filterState={filterState}
                onChange={handleBoolChange}
              />
              <FilterToggle
                label="Connected via MQTT"
                filterKey="viaMqtt"
                alternativeLabels={["Hide", "Show Only"]}
                filterState={filterState}
                onChange={handleBoolChange}
              />
            </FilterAccordionItem>

            <FilterAccordionItem label="Metrics">
              <FilterSlider
                label="SNR (db)"
                filterKey="snr"
                filterState={filterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
              />
              <FilterSlider
                label="Channel Utilization (%)"
                filterKey="channelUtilization"
                filterState={filterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
              />
              <FilterSlider
                label="Airtime Utilization (%)"
                filterKey="airUtilTx"
                filterState={filterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
              />
              <FilterSlider
                label="Battery level (%)"
                filterKey="batteryLevel"
                filterState={filterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
                labelContent={
                  <>
                    Battery level (%): {filterState.batteryLevel[0] === 101
                      ? "Plugged in"
                      : filterState.batteryLevel[0]}
                    {filterState.batteryLevel[0] !==
                        filterState.batteryLevel[1] && (
                      <>
                        {" – "}
                        {filterState.batteryLevel[1] === 101
                          ? "Plugged in"
                          : filterState.batteryLevel[1]}
                      </>
                    )}
                  </>
                }
              />
              <FilterSlider
                label="Battery voltage (V)"
                filterKey="voltage"
                filterState={filterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
              />
            </FilterAccordionItem>

            <FilterAccordionItem label="Role">
              <FilterMulti
                filterKey="role"
                filterState={filterState}
                setFilterState={setFilterState}
                options={Object.values(Protobuf.Config.Config_DeviceConfig_Role)
                  .filter(
                    (v): v is number => typeof v === "number",
                  )}
                getLabel={(val) =>
                  formatEnumLabel(
                    Protobuf.Config.Config_DeviceConfig_Role[val],
                  )}
              />
            </FilterAccordionItem>
            <FilterAccordionItem label="Hardware">
              <FilterMulti
                filterKey="hwModel"
                filterState={filterState}
                setFilterState={setFilterState}
                options={Object.values(Protobuf.Mesh.HardwareModel)
                  .filter(
                    (v): v is number => typeof v === "number",
                  )}
                getLabel={(val) =>
                  formatEnumLabel(Protobuf.Mesh.HardwareModel[val])}
              />
            </FilterAccordionItem>
          </Accordion>
          <button
            type="button"
            onClick={resetFilters}
            className="w-full py-1 shadow-sm hover:shadow-md bg-slate-600 dark:bg-slate-900 text-white rounded text-sm  hover:text-slate-100 hover:bg-slate-700 active:bg-slate-950"
          >
            Reset Filters
          </button>
          {children && (
            <div className="mt-4 border-t pt-4">
              {children}
            </div>
          )}
        </form>
      </PopoverContent>
    </Popover>
  );
}
