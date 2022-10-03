import type React from "react";
import { forwardRef, InputHTMLAttributes } from "react";

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
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

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Input(
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
    }: CheckboxProps,
    ref
  ) {
    return (
      <div className="relative flex items-start">
        <div className="flex h-5 items-center">
          <input
            ref={ref}
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            {...rest}
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor="comments" className="font-medium text-gray-700">
            {label}
          </label>
          <p className="text-gray-500">{description}</p>
        </div>
      </div>
    );
  }
);
