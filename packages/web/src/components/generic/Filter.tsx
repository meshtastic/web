import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import { cn } from "@core/utils/cn";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";

export interface FilterOption<T = string> {
  id: T;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
}

interface FilterProps<T extends string> {
  options: FilterOption[];
  activeFilter: T;
  onFilterChange: (filter: T) => void;
  variant?: "radio" | "multiselect" | "dropdown";
  className?: string;
}

export function Filter<T extends string>({
  options,
  activeFilter,
  onFilterChange,
  variant = "radio",
  className = "",
}: FilterProps<T>) {
  const handleFilterChange = (filter: T) => {
    if (variant === "radio") {
      // For radio variant, only one filter can be active
      onFilterChange(filter);
    } else if (variant === "multiselect") {
      // For multiselect, toggle the filter
      const newFilter = activeFilter === filter ? undefined : filter;
      onFilterChange(newFilter);
    } else {
      // For dropdown, simple filter change
      onFilterChange(filter);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {variant === "radio" && (
        <div className="flex flex-wrap gap-1">
          {options.map((option) => (
            <Button
              key={option.id}
              variant={activeFilter === option.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleFilterChange(option.id)}
              disabled={option.disabled}
              className="flex items-center gap-2"
            >
              {option.icon && <option.icon className="h-3 w-3" />}
              <span>{option.label}</span>
            </Button>
          ))}
        </div>
      )}

      {variant === "dropdown" && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="justify-between">
              <span>
                {options.find((opt) => opt.id === activeFilter)?.label ||
                  "Select filter"}
              </span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48">
            {options.map((option) => (
              <DropdownMenuItem
                key={option.id}
                onClick={() => handleFilterChange(option.id)}
                disabled={option.disabled}
              >
                {option.icon && <option.icon className="h-3 w-3 mr-2" />}
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {variant === "multiselect" && (
        <div className="flex flex-wrap gap-1">
          {options.map((option) => (
            <Button
              key={option.id}
              variant={activeFilter === option.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleFilterChange(option.id)}
              disabled={option.disabled}
              className="flex items-center gap-2"
            >
              {option.icon && <option.icon className="h-3 w-3" />}
              <span>{option.label}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
