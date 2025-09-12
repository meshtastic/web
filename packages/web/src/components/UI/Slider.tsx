import { cn } from "@core/utils/cn.ts";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { useId, useState } from "react";

export interface SliderProps {
  value: number[];
  step?: number;
  min?: number;
  max: number;
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
  trackClassName?: string;
  rangeClassName?: string;
  thumbClassName?: string;
}

export function Slider({
  value,
  step = 1,
  min = 0,
  max,
  id,
  onValueChange,
  onValueCommit,
  disabled = false,
  className,
  trackClassName,
  rangeClassName,
  thumbClassName,

  ...props
}: SliderProps) {
  const [internalValue, setInternalValue] = useState<number[]>(value);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;
  const generatedId = useId();
  const internalId = id ? id : generatedId;

  const handleValueChange = (newValue: number[]) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  const handleValueCommit = (newValue: number[]) => {
    onValueCommit?.(newValue);
  };

  const thumbIds = currentValue.map((_, idx) => `${internalId}-thumb-${idx}`); // Unique IDs for each thumb, pregenerated to please the linter

  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex items-center select-none touch-none",
        className,
      )}
      id={internalId}
      value={currentValue}
      step={step}
      min={min}
      max={max}
      disabled={disabled}
      onValueChange={handleValueChange}
      onValueCommit={handleValueCommit}
      {...props}
    >
      <SliderPrimitive.Track
        className={cn(
          "relative h-2 flex-1 rounded-full bg-slate-200",
          trackClassName,
        )}
      >
        <SliderPrimitive.Range
          className={cn(
            "absolute h-full rounded-full bg-blue-500",
            rangeClassName,
          )}
        />
      </SliderPrimitive.Track>
      {currentValue.map((_, idx) => (
        <SliderPrimitive.Thumb
          key={thumbIds[idx]}
          className={cn(
            "block w-4 h-4 rounded-full bg-white border border-slate-400 shadow-md",
            thumbClassName,
          )}
          aria-label={`Thumb ${idx + 1}`}
        />
      ))}
    </SliderPrimitive.Root>
  );
}
