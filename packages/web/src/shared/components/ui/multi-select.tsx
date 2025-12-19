import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@shared/utils/cn";

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
        `
        inline-flex items-center rounded-md px-3 py-2 text-sm transition-colors
        border border-border
        hover:bg-accent/20
        focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2
        data-[state=checked]:bg-accent/30`,
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
