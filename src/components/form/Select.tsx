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
          className={`block w-full min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
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
            className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {action.icon}
          </button>
        )}
      </div>
    </div>
  );
});
