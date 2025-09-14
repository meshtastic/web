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
import { FunnelIcon } from "lucide-react";
import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

const DEBOUNCE_DELAY_MS = 250;

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

interface RangeLabelContentProps {
  range: [number, number];
  defaultRange: [number, number];
  format?: (ts: number) => ReactNode;
  initialLabel?: ReactNode;
  customLabel?: { start?: string; end?: string };
}

function RangeLabelContent({
  range,
  defaultRange,
  format,
  initialLabel,
  customLabel,
}: RangeLabelContentProps) {
  const [start, end] = range;
  const [min, max] = defaultRange;
  const unequal = start !== end;

  const fmtStart = format ? format(start) : start;
  const fmtEnd = format ? format(end) : end;

  return (
    <>
      {initialLabel}
      {start === min
        ? (customLabel?.start ?? (
            <>
              {"<"}
              {fmtStart}
            </>
          ))
        : start === max
          ? (customLabel?.end ?? (
              <>
                {">"}
                {fmtEnd}
              </>
            ))
          : fmtStart}
      {unequal && (
        <>
          {" — "}
          {end === max
            ? (customLabel?.end ?? (
                <>
                  {">"}
                  {fmtEnd}
                </>
              ))
            : fmtEnd}
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
    <K extends keyof FilterState>(
      key: K,
      value: string | boolean | undefined,
    ) => {
      let typedValue: boolean | undefined;
      if (value === true || value === "true") {
        typedValue = true;
      } else if (value === false || value === "false") {
        typedValue = false;
      } else {
        typedValue = undefined;
      }

      setFilterState((prev) => ({ ...prev, [key]: typedValue }));
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

  const roleOptions = useMemo(
    () =>
      Object.values(Protobuf.Config.Config_DeviceConfig_Role).filter(
        (v): v is number => typeof v === "number",
      ),
    [],
  );
  const hwModelOptions = useMemo(
    () =>
      Object.values(Protobuf.Mesh.HardwareModel).filter(
        (v): v is number => typeof v === "number",
      ),
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
            isDirty &&
              "text-slate-100 dark:text-slate-300 bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-800 hover:text-slate-200 dark:hover:text-slate-300 active:bg-green-800 dark:active:bg-green-900",
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
                    value={filterState.nodeName}
                    onChange={handleTextChange("nodeName")}
                    showClearButton
                    placeholder={t("nodeName.placeholder")}
                  />
                </div>
              )}
              <FilterSlider
                filterKey="hopsAway"
                filterState={localFilterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
                labelContent={
                  <RangeLabelContent
                    range={localFilterState.hopsAway}
                    defaultRange={defaultFilterValues.hopsAway}
                    initialLabel={`${t("hops.label")}: `}
                    customLabel={{ start: "0", end: "7" }}
                  />
                }
              />
              <FilterSlider
                filterKey="lastHeard"
                filterState={localFilterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
                labelContent={
                  <RangeLabelContent
                    range={localFilterState.lastHeard}
                    defaultRange={defaultFilterValues.lastHeard}
                    format={formatTS}
                    initialLabel={`${t("lastHeard.label")}: `}
                    customLabel={{ start: t("lastHeard.nowLabel") }}
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
                filterKey="snr"
                filterState={localFilterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
                labelContent={
                  <RangeLabelContent
                    range={localFilterState.snr}
                    defaultRange={defaultFilterValues.snr}
                    initialLabel={`${t("snr.label")}: `}
                  />
                }
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
                filterKey="batteryLevel"
                filterState={localFilterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
                labelContent={
                  <RangeLabelContent
                    range={localFilterState.batteryLevel}
                    defaultRange={defaultFilterValues.batteryLevel}
                    initialLabel={`${t("batteryLevel.label")}: `}
                    customLabel={{
                      start: "0",
                      end: t("batteryStatus.pluggedIn"),
                    }}
                  />
                }
              />
              <FilterSlider
                filterKey="voltage"
                filterState={localFilterState}
                defaultFilterValues={defaultFilterValues}
                onChange={handleRangeChange}
                step={0.1}
                labelContent={
                  <RangeLabelContent
                    range={localFilterState.voltage}
                    defaultRange={defaultFilterValues.voltage}
                    initialLabel={`${t("batteryVoltage.label")}: `}
                    customLabel={{ start: "0" }}
                  />
                }
              />
            </FilterAccordionItem>

            <FilterAccordionItem label={t("role.label")}>
              <FilterMulti
                filterKey="role"
                filterState={filterState}
                setFilterState={setFilterState}
                options={roleOptions}
                getLabel={(val) =>
                  formatEnumLabel(
                    Protobuf.Config.Config_DeviceConfig_Role[val] ?? "UNSET",
                  )
                }
              />
            </FilterAccordionItem>

            <FilterAccordionItem label={t("hardware.label")}>
              <FilterMulti
                filterKey="hwModel"
                filterState={filterState}
                setFilterState={setFilterState}
                options={hwModelOptions}
                getLabel={(val) =>
                  formatEnumLabel(Protobuf.Mesh.HardwareModel[val] ?? "UNKNOWN")
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
