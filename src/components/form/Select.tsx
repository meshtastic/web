import type React from "react";
import { forwardRef, SelectHTMLAttributes } from "react";

import { InfoWrapper, InfoWrapperProps } from "@components/form/InfoWrapper.js";

export interface SelectProps
  extends SelectHTMLAttributes<HTMLSelectElement>,
    Omit<InfoWrapperProps, "children"> {
  options?: string[];
  action?: {
    icon: JSX.Element;
    action: () => void;
  };
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Input(
  {
    label,
    description,
    options,
    action,
    disabled,
    error,
    children,
    ...rest
  }: SelectProps,
  ref
) {
  return (
    <InfoWrapper label={label} description={description} error={error}>
      <div className="flex rounded-md shadow-sm">
        <select
          ref={ref}
          className={`flex h-10 w-full rounded-md border-transparent bg-orange-100 px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500 ${
            action ? "rounded-r-none" : ""
          } ${
            disabled ? "cursor-not-allowed bg-orange-50 text-orange-200" : ""
          }`}
          disabled={disabled}
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
            className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md bg-orange-200 px-4 py-2 text-sm font-medium hover:bg-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {action.icon}
          </button>
        )}
      </div>
    </InfoWrapper>
  );
});
