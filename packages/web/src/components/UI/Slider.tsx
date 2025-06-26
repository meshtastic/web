import { useId, useState } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@core/utils/cn.ts";

export interface SliderProps {
  value: number[];
  step?: number;
  min?: number;
  max: number;
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
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
  const currentValue = isControlled ? value! : internalValue;
  const id = useId();

  const handleValueChange = (newValue: number[]) => {
    if (!isControlled) setInternalValue(newValue);
    onValueChange?.(newValue);
  };

  const handleValueCommit = (newValue: number[]) => {
    onValueCommit?.(newValue);
  };

  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex items-center select-none touch-none",
        className,
      )}
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
      {currentValue.map((_, i) => (
        <SliderPrimitive.Thumb
          key={`${id}-thumb-${i}`}
          className={cn(
            "block w-4 h-4 rounded-full bg-white border border-slate-400 shadow-md",
            thumbClassName,
          )}
          aria-label={`Thumb ${i + 1}`}
        />
      ))}
    </SliderPrimitive.Root>
  );
}
