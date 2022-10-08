import type React from "react";
import { forwardRef, InputHTMLAttributes } from "react";

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Input({ label, disabled, ...rest }: CheckboxProps, ref) {
    return (
      <div className="relative flex items-start">
        <div className="flex h-5 items-center">
          <input
            ref={ref}
            type="checkbox"
            className={`h-4 w-4 rounded border-transparent bg-orange-100 text-orange-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500 ${
              disabled ? "cursor-not-allowed text-orange-200" : ""
            }`}
            disabled={disabled}
            {...rest}
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor="comments" className="font-medium text-gray-700">
            {label}
          </label>
        </div>
      </div>
    );
  }
);
