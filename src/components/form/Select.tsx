import type React from "react";
import { forwardRef, SelectHTMLAttributes } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  description?: string;
  options?: string[];
  prefix?: string;
  suffix?: string;
  action?: {
    icon: JSX.Element;
    action: () => void;
  };
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Input(
  {
    label,
    description,
    options,
    prefix,
    suffix,
    action,
    error,
    children,
    ...rest
  }: SelectProps,
  ref
) {
  return (
    <div>
      <label
        htmlFor="location"
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <div className="flex">
        <select
          ref={ref}
          className={`flex h-10 w-full rounded-md bg-orange-100 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
            prefix ? "rounded-l-none" : ""
          } ${action ? "rounded-r-none" : ""}`}
          {...rest}
        >
          {options &&
            options.map((option, index) => (
              <option key={index}>{option}</option>
            ))}
          {children}
        </select>
        {action && (
          <button
            type="button"
            onClick={action.action}
            className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md bg-orange-200 px-4 py-2 text-sm font-medium hover:bg-orange-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {action.icon}
          </button>
        )}
      </div>
    </div>
  );
});
