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
            className={`h-4 w-4 rounded border-none bg-backgroundPrimary text-accent focus:outline-none focus:ring-2 focus:ring-accent ${
              disabled
                ? "bg-orange-50 cursor-not-allowed text-accent brightness-disabled"
                : ""
            }`}
            disabled={disabled}
            {...rest}
          />
        </div>
        <div className="ml-3 text-sm">
          <label
            className={`font-medium  ${
              disabled ? "text-textSecondary" : "text-textPrimary"
            }`}
          >
            {label}
          </label>
        </div>
      </div>
    );
  }
);
