import { cn } from "@core/utils/cn.ts";
import { Check } from "lucide-react";
import { useId } from "react";

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
  checked = false,
  onChange,
  className,
  id: propId,
  children,
  disabled = false,
  required = false,
  name,
  ...rest
}: CheckboxProps) {
  const generatedId = useId();
  const id = propId || generatedId;

  const handleToggle = (): void => {
    if (!disabled) {
      onChange?.(!checked);
    }
  };

  return (
    <label
      className={cn(
        "inline-flex items-center gap-3",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className,
      )}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={handleToggle}
        disabled={disabled}
        required={required}
        name={name}
        className="sr-only peer"
        {...rest}
      />
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-gray-500 transition-colors",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2",
          { "border-slate-500 bg-slate-500": checked },
        )}
      >
        {checked && (
          <div className="animate-fade-in">
            <Check className="h-4 w-4 text-white" />
          </div>
        )}
      </div>
      {children && (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {children}
        </span>
      )}
    </label>
  );
}
