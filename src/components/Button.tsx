import type React from "react";
import type { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
  iconBefore?: JSX.Element;
  iconAfter?: JSX.Element;
}

export const Button = ({
  size = "md",
  variant = "primary",
  iconBefore,
  iconAfter,
  children,
  disabled,
  ...rest
}: ButtonProps): JSX.Element => {
  return (
    <button
      className={`flex w-full rounded-md border border-transparent px-3 focus:outline-none focus:ring-2 focus:ring-orange-500  ${
        variant === "primary"
          ? "bg-orange-600 text-white shadow-sm hover:bg-orange-700"
          : "bg-orange-100 text-orange-700 hover:bg-orange-200"
      } ${
        size === "sm"
          ? "h-8 text-sm"
          : size === "md"
          ? "h-10 text-sm"
          : "h-10 text-base"
      } ${disabled ? "cursor-not-allowed bg-red-400 focus:ring-red-500" : ""}`}
      disabled={disabled}
      {...rest}
    >
      <div className="m-auto flex shrink-0 items-center gap-2 font-medium">
        {iconBefore}
        {children}
        {iconAfter}
      </div>
    </button>
  );
};
