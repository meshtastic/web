import {
  FilterAccordionItem,
  FilterMulti,
  FilterSlider,
  FilterToggle,
} from "@components/generic/Filter/FilterComponents.tsx";
import type { FilterState } from "@components/generic/Filter/useFilterNode.ts";
import { TimeAgo } from "@components/generic/TimeAgo.tsx";
import { Accordion } from "@components/UI/Accordion.tsx";
import { Input } from "@components/UI/Input.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/UI/Popover.tsx";
import { cn } from "@core/utils/cn.ts";
import { debounce } from "@core/utils/debounce.ts";
import { Protobuf } from "@meshtastic/core";
import type { TFunction } from "i18next";
import { FunnelIcon } from "lucide-react";
import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

const DEBOUNCE_DELAY_MS = 250;
const BATTERY_STATUS_PLUGGED_IN_VALUE = 101;

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

interface HopsLabelProps {
  hopsAway: number[];
  t: TFunction<"ui", undefined>;
}
function HopsLabelContent({ hopsAway, t }: HopsLabelProps) {
  const startHops = hopsAway[0];
  const endHops = hopsAway[1];

  return (
    <>
      {t("hops.text", {
        value: startHops === 0 ? t("hops.direct") : startHops,
      })}
      {startHops !== endHops ? ` — ${endHops}` : ""}
    </>
  );
}

interface LastHeardLabelProps {
  lastHeardRange: number[];
  defaultMaxLastHeard: number;
  formatTS: (ts: number) => ReactNode;
  t: TFunction<"ui", undefined>;
}
function LastHeardLabelContent({
  lastHeardRange,
  defaultMaxLastHeard,
  formatTS,
  t,
}: LastHeardLabelProps) {
  const [start, end] = lastHeardRange;
  return (
    <>
      {t("lastHeard.labelText", { value: "" })}
      <br />
      {start === 0 ? (
        t("lastHeard.nowLabel")
      ) : (
        <>
          {start === defaultMaxLastHeard && ">"}
          {formatTS(start)}
        </>
      )}
      {start !== end && (
        <>
          {" — "}
          {end === defaultMaxLastHeard && ">"}
          {formatTS(end)}
        </>
      )}
    </>
  );
}

interface BatteryLevelLabelProps {
  batteryLevelRange: (number | undefined)[];
  t: TFunction<"ui", undefined>;
}
function BatteryLevelLabelContent({
  batteryLevelRange,
  t,
}: BatteryLevelLabelProps) {
  const [start, end] = batteryLevelRange;

  const formatBatteryValue = (value: number | undefined) => {
    if (value === undefined) {
      return "";
    }
    return value === BATTERY_STATUS_PLUGGED_IN_VALUE
      ? t("batteryStatus.pluggedIn")
      : `${value}%`;
  };

  return (
    <>
      {t("batteryLevel.labelText", {
        value: formatBatteryValue(start),
      })}
      {start !== end && typeof end !== "undefined" && (
        <>
          {" – "}
          {formatBatteryValue(end)}
        </>
      )}
    </>
  );
}

export function FilterControl({
  filterState,
  defaultFilterValues,
  setFilterState,
  isDirty,
  parameters,
  children,
}: FilterControlProps) {
  const { t } = useTranslation("ui");
  const [localFilterState, setLocalFilterState] = useState(filterState);
  const skipNextFilterStateSync = useRef(false);

  useEffect(() => {
    if (skipNextFilterStateSync.current) {
      skipNextFilterStateSync.current = false;
      return;
    }
    setLocalFilterState(filterState);
  }, [filterState]);

  const handleTextChange = useCallback(
    <K extends keyof FilterState>(key: K) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilterState((prev) => ({
          ...prev,
          [key]: e.target.value,
        }));
      },
    [setFilterState],
  );

  const debouncedSetFilterState = useCallback(
    debounce(<K extends keyof FilterState>(key: K, value: number[]) => {
      skipNextFilterStateSync.current = true;
      setFilterState((prev) => ({
        ...prev,
        [key]: value,
      }));
    }, DEBOUNCE_DELAY_MS),
    [],
  );

  const handleRangeChange = useCallback(
    <K extends keyof FilterState>(key: K) =>
      (value: number[]) => {
        setLocalFilterState((prev) => ({
          ...prev,
          [key]: value,
        }));
        debouncedSetFilterState(key, value);
      },
    [debouncedSetFilterState],
  );

  const handleBoolChange = useCallback(
    <K extends keyof FilterState>(key: K, value: string | boolean) => {
      const typedValue =
        value === true || value === "true"
          ? true
          : value === false || value === "false"
            ? false
            : undefined;

      setFilterState((prev) => ({
        ...prev,
        [key]: typedValue,
      }));
    },
    [setFilterState],
  );

  const resetFilters = useCallback(() => {
    setFilterState(defaultFilterValues);
  }, [defaultFilterValues, setFilterState]);

  const formatTS = useCallback(
    (ts: number): ReactNode => <TimeAgo timestamp={Date.now() - ts * 1000} />,
    [],
  );

  const formatEnumLabel = useCallback(
    (label: string): string => label.replace(/_/g, " "),
    [],
  );

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
          aria-label={t("filter.label")}
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
            defaultValue={t("general.label")}
            collapsible
          >
            <FilterAccordionItem label={t("general.label")}>
              {(parameters?.showTextSearch ?? true) && (
                <div className="flex flex-col space-y-1 pb-2">
                  <label htmlFor="nodeName" className="font-medium text-sm">
                    {t("nodeName.label")}
                  </label>
                  <Input
                    type="text"
                    id="nodeName"
                    value={filterState.nodeName}
                    onChange={handleTextChange("nodeName")}
                    showClearButton
                    placeholder={t("nodeName.placeholder")}
                  />
                </div>
              )}
              <FilterSlider
                label={t("hops.label")}
                filterKey="hopsAway"
                filterState={localFilterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
                labelContent={
                  <HopsLabelContent
                    hopsAway={localFilterState.hopsAway}
                    t={t}
                  />
                }
              />
              <FilterSlider
                label={t("lastHeard.label")}
                filterKey="lastHeard"
                filterState={localFilterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
                labelContent={
                  <LastHeardLabelContent
                    lastHeardRange={localFilterState.lastHeard}
                    defaultMaxLastHeard={defaultFilterValues.lastHeard[1]}
                    formatTS={formatTS}
                    t={t}
                  />
                }
              />
              <FilterToggle
                label={t("favorites.label")}
                filterKey="isFavorite"
                alternativeLabels={[t("hide.label"), t("showOnly.label")]}
                filterState={filterState}
                onChange={handleBoolChange}
              />
              <FilterToggle
                label={t("viaMqtt.label")}
                filterKey="viaMqtt"
                alternativeLabels={[t("hide.label"), t("showOnly.label")]}
                filterState={filterState}
                onChange={handleBoolChange}
              />
            </FilterAccordionItem>

            <FilterAccordionItem label={t("metrics.label")}>
              <FilterSlider
                label={t("snr.label")}
                filterKey="snr"
                filterState={localFilterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
              />
              <FilterSlider
                label={t("channelUtilization.label")}
                filterKey="channelUtilization"
                filterState={localFilterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
              />
              <FilterSlider
                label={t("airtimeUtilization.label")}
                filterKey="airUtilTx"
                filterState={localFilterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
              />
              <FilterSlider
                label={t("batteryLevel.label")}
                filterKey="batteryLevel"
                filterState={localFilterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
                labelContent={
                  <BatteryLevelLabelContent
                    batteryLevelRange={localFilterState.batteryLevel}
                    t={t}
                  />
                }
              />
              <FilterSlider
                label={t("batteryVoltage.label")}
                filterKey="voltage"
                filterState={localFilterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
              />
            </FilterAccordionItem>

            <FilterAccordionItem label={t("role.label")}>
              <FilterMulti
                filterKey="role"
                filterState={filterState}
                setFilterState={setFilterState}
                options={Object.values(
                  Protobuf.Config.Config_DeviceConfig_Role,
                ).filter((v): v is number => typeof v === "number")}
                getLabel={(val) =>
                  formatEnumLabel(Protobuf.Config.Config_DeviceConfig_Role[val])
                }
              />
            </FilterAccordionItem>

            <FilterAccordionItem label={t("hardware.label")}>
              <FilterMulti
                filterKey="hwModel"
                filterState={filterState}
                setFilterState={setFilterState}
                options={Object.values(Protobuf.Mesh.HardwareModel).filter(
                  (v): v is number => typeof v === "number",
                )}
                getLabel={(val) =>
                  formatEnumLabel(Protobuf.Mesh.HardwareModel[val])
                }
              />
            </FilterAccordionItem>
            <FilterAccordionItem label={t("advanced.label")}>
              <FilterToggle
                label={t("hopsUnknown.label")}
                filterKey="hopsUnknown"
                alternativeLabels={[t("hide.label"), t("showOnly.label")]}
                filterState={filterState}
                onChange={handleBoolChange}
              />
              <FilterToggle
                label={t("showUnheard.label")}
                filterKey="showUnheard"
                alternativeLabels={[t("hide.label"), t("showOnly.label")]}
                filterState={filterState}
                onChange={handleBoolChange}
              />
            </FilterAccordionItem>
          </Accordion>
          <button
            type="button"
            onClick={resetFilters}
            className="w-full py-1 shadow-sm hover:shadow-md bg-slate-600 dark:bg-slate-900 text-white rounded text-sm hover:text-slate-100 hover:bg-slate-700 active:bg-slate-950"
          >
            {t("button.reset")}
          </button>
          {children && <div className="mt-4 border-t pt-4">{children}</div>}
        </form>
      </PopoverContent>
    </Popover>
  );
}
