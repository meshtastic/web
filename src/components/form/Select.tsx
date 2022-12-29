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
      <div className="flex rounded-md">
        <select
          ref={ref}
          className={`flex h-10 w-full rounded-md border-transparent bg-backgroundPrimary px-3 text-sm text-textPrimary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent ${
            action ? "rounded-r-none" : ""
          } ${
            disabled
              ? "cursor-not-allowed text-textSecondary brightness-disabled hover:brightness-disabled"
              : ""
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
            className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md bg-backgroundPrimary px-4 py-2 text-sm font-medium text-textSecondary brightness-hover hover:brightness-hover focus:outline-none focus:ring-2 focus:ring-accent active:brightness-press"
          >
            {action.icon}
          </button>
        )}
      </div>
    </InfoWrapper>
  );
});
