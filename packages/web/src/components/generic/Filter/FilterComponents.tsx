import type { FilterState } from "@components/generic/Filter/useFilterNode.ts";
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from "@components/UI/Accordion.tsx";
import { Checkbox } from "@components/UI/Checkbox/index.tsx";
import { ScrollArea } from "@components/UI/ScrollArea.tsx";
import { Slider } from "@components/UI/Slider.tsx";
import { ToggleGroup, ToggleGroupItem } from "@components/UI/ToggleGroup.tsx";
import { cn } from "@core/utils/cn.ts";
import type { ReactNode } from "react";
import { useId } from "react";

interface FilterAccordionItemProps {
  label: string;
  children?: ReactNode;
}

type RangeKeys<T> = {
  [K in keyof T]: T[K] extends [number, number] ? K : never;
}[keyof T];
interface FilterSliderProps<K extends RangeKeys<FilterState>> {
  filterKey: K;
  filterState: FilterState;
  defaultFilterValues: FilterState;
  onChange: (key: K) => (value: number[]) => void;
  labelContent?: React.ReactNode;
  label?: string;
  step?: number;
}

type EnumArrayKeys<T> = {
  [K in keyof T]: T[K] extends number[] ? K : never;
}[keyof T];
interface FilterMultiProps<K extends EnumArrayKeys<FilterState>> {
  filterKey: K;
  options: number[];
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  getLabel?: (value: number) => string;
}

interface FilterToggleProps<K extends keyof FilterState> {
  label: string;
  alternativeLabels: [string, string];
  filterKey: K;
  filterState: FilterState;
  onChange: (key: K, value: string) => void;
}

export const FilterAccordionItem = ({
  label,
  children,
}: FilterAccordionItemProps) => {
  return (
    <AccordionItem value={label}>
      <AccordionHeader>
        <AccordionTrigger
          className={cn(
            "w-full text-left font-bold text-sm px-1 py-2 dark:border-slate-700 text-slate-800 dark:text-slate-200",
          )}
        >
          {label}
        </AccordionTrigger>
      </AccordionHeader>
      <AccordionContent
        className={cn("px-1 pb-4 pt-2 space-y-3 dark:border-slate-700")}
      >
        {children}
      </AccordionContent>
    </AccordionItem>
  );
};

export const FilterSlider = <K extends RangeKeys<FilterState>>({
  filterKey,
  filterState,
  defaultFilterValues,
  onChange,
  labelContent,
  label,
  step,
}: FilterSliderProps<K>) => {
  const sliderId = useId();
  const value: [number, number] = filterState[filterKey];
  const defaultValue: [number, number] = defaultFilterValues[filterKey];

  const showRange = value[0] !== value[1];
  const defaultLabel = (
    <>
      {label}: {value[0]}
      {showRange ? ` — ${value[1]}` : ""}
    </>
  );

  return (
    <div className="space-y-2">
      <label htmlFor={sliderId} className="block text-sm font-medium">
        {labelContent ?? defaultLabel}
      </label>
      <Slider
        value={value}
        min={defaultValue[0]}
        max={defaultValue[1]}
        step={step ?? 1}
        onValueChange={onChange(filterKey)}
        className="w-full pb-3"
        trackClassName="h-1 bg-slate-200 dark:bg-slate-700"
        rangeClassName="bg-blue-500 dark:bg-blue-600"
        thumbClassName="w-3 h-3 bg-white dark:bg-slate-300 border border-slate-400 dark:border-slate-100"
        aria-label={label ?? String(filterKey)}
        id={sliderId}
      />
    </div>
  );
};

function getNumberArray<T extends FilterState, K extends EnumArrayKeys<T>>(
  state: T,
  key: K,
): number[] {
  return state[key] as number[];
}
export const FilterMulti = <K extends EnumArrayKeys<FilterState>>({
  filterKey,
  options,
  filterState,
  setFilterState,
  getLabel = (v) => String(v),
}: FilterMultiProps<K>) => {
  const selected = getNumberArray(filterState, filterKey);

  const allSelected =
    options.length > 0 && options.every((opt) => selected.includes(opt));

  const toggleAll = () => {
    setFilterState((prev) => ({
      ...prev,
      [filterKey]: allSelected ? [] : [...options],
    }));
  };

  const toggleValue = (val: number, checked: boolean) => {
    setFilterState((prev) => {
      const current = getNumberArray(prev, filterKey);
      return {
        ...prev,
        [filterKey]: checked
          ? [...current, val]
          : current.filter((v) => v !== val),
      };
    });
  };

  return (
    <div className="space-y-2">
      <ScrollArea className="h-64 border rounded-md dark:border-slate-700">
        <div className="space-y-2 px-2 py-3">
          <button
            type="button"
            className="w-full py-1 shadow-sm hover:shadow-md bg-slate-600 dark:bg-slate-900 text-white rounded text-sm  hover:text-slate-100 hover:bg-slate-700 active:bg-slate-950"
            onClick={toggleAll}
          >
            {allSelected ? "Uncheck All" : "Check All"}
          </button>
          {options.map((val) => (
            <Checkbox
              key={val}
              checked={selected.includes(val)}
              onChange={(checked) => toggleValue(val, checked)}
              className="flex items-center gap-2"
            >
              <span className="dark:text-slate-200">{getLabel(val)}</span>
            </Checkbox>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export const FilterToggle = <K extends keyof FilterState>({
  label,
  alternativeLabels,
  filterKey,
  filterState,
  onChange,
}: FilterToggleProps<K>) => (
  <div className="space-y-1 pb-1">
    <label htmlFor={label} className="block text-sm font-medium">
      {label}
    </label>
    <ToggleGroup
      type="single"
      aria-label={label}
      id={label}
      onValueChange={(value) => onChange(filterKey, value)}
      value={
        typeof filterState[filterKey] === "undefined"
          ? ""
          : String(filterState[filterKey])
      }
    >
      <ToggleGroupItem
        value="false"
        aria-label={alternativeLabels[0]}
        className="text-sm h-7 dark:bg-slate-900"
      >
        {alternativeLabels[0]}
      </ToggleGroupItem>
      <ToggleGroupItem
        value="true"
        aria-label={alternativeLabels[1]}
        className="text-sm h-7 dark:bg-slate-900"
      >
        {alternativeLabels[1]}
      </ToggleGroupItem>
    </ToggleGroup>
  </div>
);
