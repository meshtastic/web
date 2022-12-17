import type React from "react";
import type { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
  color?: string;
  iconBefore?: JSX.Element;
}

export const Button = ({
  size = "md",
  color = "bg-accentMuted",
  iconBefore,
  children,
  disabled,
  className,
  ...rest
}: ButtonProps): JSX.Element => {
  return (
    <button
      className={`flex w-full rounded-md ${color} px-3 text-textPrimary hover:brightness-hover focus:outline-none active:brightness-press ${
        size === "sm"
          ? "h-8 text-sm"
          : size === "md"
          ? "h-10 text-sm"
          : "h-10 text-base"
      } ${
        disabled
          ? "cursor-not-allowed text-textSecondary brightness-disabled hover:brightness-disabled"
          : ""
      } ${className}`}
      disabled={disabled}
      {...rest}
    >
      <div className="m-auto flex shrink-0 items-center gap-2 font-medium">
        {iconBefore}
        {children}
      </div>
    </button>
  );
};
