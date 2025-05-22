import {
  type ComponentProps,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Protobuf } from "@meshtastic/core";
import { debounce } from "@core/utils/debounce.ts";
import { cn } from "@core/utils/cn.ts";
import { TimeAgo } from "@components/generic/TimeAgo.tsx";
import type { FilterState } from "@components/generic/Filter/useFilterNode.ts";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/UI/Popover.tsx";
import { Input } from "@components/UI/Input.tsx";
import { Accordion } from "@components/UI/Accordion.tsx";
import { FunnelIcon } from "lucide-react";

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
  // Copy of the state that we only use for rendering sliders and their labels directly, rest is debounced
  const [localFilterState, setLocalFilterState] = useState(filterState);
  const skipNextSync = useRef(false);
  useEffect(() => {
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    setLocalFilterState(filterState);
  }, [filterState]);

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
      // immediate slider update
      setLocalFilterState((prev) => ({
        ...prev,
        [key]: value,
      }));

      // debounced write to filterState (table/map render)
      debounce(
        () => {
          skipNextSync.current = true;
          setFilterState((prev) => ({
            ...prev,
            [key]: value,
          }));
        },
        250,
      )();
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
                  <Input
                    type="text"
                    value={filterState.nodeName}
                    onChange={handleTextChange("nodeName")}
                    showClearButton
                    placeholder="Meshtastic 1234"
                  />
                </div>
              )}

              <FilterSlider
                label="Number of hops"
                filterKey="hopsAway"
                filterState={localFilterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
                labelContent={
                  <>
                    Number of hops: {localFilterState.hopsAway[0] === 0
                      ? "Direct"
                      : localFilterState.hopsAway[0]}
                    {localFilterState.hopsAway[0] !==
                        localFilterState.hopsAway[1]
                      ? " — " + localFilterState.hopsAway[1]
                      : ""}
                  </>
                }
              />

              <FilterSlider
                label="Last heard"
                filterKey="lastHeard"
                filterState={localFilterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
                labelContent={
                  <>
                    Last heard: <br />
                    {localFilterState.lastHeard[0] === 0 ? "Now" : (
                      <>
                        {localFilterState.lastHeard[0] ===
                            defaultFilterValues.lastHeard[1] && ">"}
                        {formatTS(localFilterState.lastHeard[0])}
                      </>
                    )}
                    {localFilterState.lastHeard[0] !==
                        localFilterState.lastHeard[1] && (
                      <>
                        {" — "}
                        {localFilterState.lastHeard[1] ===
                            defaultFilterValues.lastHeard[1] && ">"}
                        {formatTS(localFilterState.lastHeard[1])}
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
                filterState={localFilterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
              />
              <FilterSlider
                label="Channel Utilization (%)"
                filterKey="channelUtilization"
                filterState={localFilterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
              />
              <FilterSlider
                label="Airtime Utilization (%)"
                filterKey="airUtilTx"
                filterState={localFilterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
              />
              <FilterSlider
                label="Battery level (%)"
                filterKey="batteryLevel"
                filterState={localFilterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
                labelContent={
                  <>
                    Battery level (%): {localFilterState.batteryLevel[0] === 101
                      ? "Plugged in"
                      : localFilterState.batteryLevel[0]}
                    {localFilterState.batteryLevel[0] !==
                        localFilterState.batteryLevel[1] && (
                      <>
                        {" – "}
                        {localFilterState.batteryLevel[1] === 101
                          ? "Plugged in"
                          : localFilterState.batteryLevel[1]}
                      </>
                    )}
                  </>
                }
              />
              <FilterSlider
                label="Battery voltage (V)"
                filterKey="voltage"
                filterState={localFilterState}
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
