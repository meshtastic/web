import { useMemo, useState } from "react";

export interface FilterOption<T = string> {
  id: T;
  label: string;
  icon?: any;
  disabled?: boolean;
}

export interface UseFilterOptions<T> {
  options: FilterOption[];
  defaultFilter?: T;
  variant?: "radio" | "multiselect" | "dropdown";
}

export const useFilter = <T>({
  options,
  defaultFilter,
  variant = "radio",
}: UseFilterOptions<T>) => {
  const [activeFilter, setActiveFilter] = useState<T>(defaultFilter as T);

  const filteredData = useMemo(() => {
    if (!activeFilter) {
      return options;
    }
    return options.filter((option) => option.id === activeFilter);
  }, [activeFilter]);

  const handleFilterChange = (filter: T) => {
    if (variant === "radio") {
      // For radio variant, only one filter can be active
      setActiveFilter(filter);
    } else if (variant === "multiselect") {
      // For multiselect, toggle the filter
      setActiveFilter(activeFilter === filter ? undefined : filter);
    } else {
      // For dropdown, simple filter change
      setActiveFilter(filter);
    }
  };

  return {
    activeFilter,
    setActiveFilter: handleFilterChange,
    filteredData,
  };
};
