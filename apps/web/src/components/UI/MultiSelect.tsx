import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "../../core/utils/cn.ts";

interface MultiSelectProps {
  children: React.ReactNode;
  className?: string;
}

const MultiSelect = ({ children, className = "" }: MultiSelectProps) => {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>{children}</div>
  );
};

interface MultiSelectItemProps {
  name: string;
  value: string;
  checked: boolean;
  onCheckedChange: (name: string, value: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

const MultiSelectItem = ({
  name,
  value,
  checked,
  onCheckedChange,
  children,
  className = "",
}: MultiSelectItemProps) => {
  return (
    <CheckboxPrimitive.Root
      name={name}
      id={value}
      checked={checked}
      onCheckedChange={(val) => onCheckedChange(name, !!val)}
      className={cn(
        "inline-flex cursor-pointer items-center rounded-control border border-control bg-app px-3 py-2 text-sm text-primary transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-accent-tint data-[state=checked]:bg-accent-tint data-[state=checked]:text-on-accent-tint data-[state=checked]:hover:bg-accent-tint",
        className,
      )}
    >
      <CheckboxPrimitive.Indicator className="mr-2">
        <Check className="h-4 w-4 animate-in zoom-in duration-200" />
      </CheckboxPrimitive.Indicator>
      {children}
    </CheckboxPrimitive.Root>
  );
};

export { MultiSelect, MultiSelectItem };
