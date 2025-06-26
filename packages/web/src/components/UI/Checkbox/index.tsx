import { useEffect, useId, useState } from "react";
import { Check } from "lucide-react";
import { Label } from "@components/UI/Label.tsx";
import { cn } from "@core/utils/cn.ts";

interface CheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  className?: string;
  labelClassName?: string;
  id?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
  name?: string;
}

export function Checkbox({
  checked,
  onChange,
  className,
  labelClassName,
  id: propId,
  children,
  disabled = false,
  required = false,
  name,
  ...rest
}: CheckboxProps) {
  const generatedId = useId();
  const id = propId || generatedId;

  const [isChecked, setIsChecked] = useState(checked || false);

  // Make sure setIsChecked state updates with checked
  useEffect(() => {
    setIsChecked(checked || false);
  }, [checked]);

  const handleToggle = () => {
    if (disabled) return;

    const newChecked = !isChecked;
    setIsChecked(newChecked);
    onChange?.(newChecked);
  };

  return (
    <div className={cn("flex items-center", className)}>
      <div className="relative flex items-start">
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            id={id}
            checked={isChecked}
            onChange={handleToggle}
            disabled={disabled}
            required={required}
            name={name}
            className="sr-only"
            {...rest}
          />
          <div
            onClick={handleToggle}
            role="presentation"
            className={cn(
              "w-6 h-6 border-2 border-gray-500 rounded-md flex items-center justify-center",
              disabled
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              isChecked ? "" : "",
            )}
          >
            {isChecked && (
              <div className="animate-fade-in scale-100 opacity-100">
                <Check className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>

        {children && (
          <div className="ml-3 text-sm">
            <Label
              htmlFor={id}
              id={`${id}-label`}
              className={cn(
                "text-gray-900 dark:text-gray-900",
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                labelClassName,
              )}
            >
              {children}
            </Label>
          </div>
        )}
      </div>
    </div>
  );
}
