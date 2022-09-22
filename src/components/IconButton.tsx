import type React from "react";
import type { ButtonHTMLAttributes } from "react";

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
  icon?: JSX.Element;
}

export const IconButton = ({
  size = "md",
  variant = "primary",
  icon,
  disabled,
  className,
  ...rest
}: IconButtonProps): JSX.Element => {
  return (
    <button
      className={`flex rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
        variant === "primary"
          ? "bg-orange-600 text-white shadow-sm hover:bg-orange-700"
          : "bg-orange-100 text-orange-700 hover:bg-orange-200"
      } ${
        size === "sm" ? "h-8 w-8" : size === "md" ? "h-10 w-10" : "h-12 w-12"
      } ${disabled ? "cursor-not-allowed bg-red-400 focus:ring-red-500" : ""} ${
        className ?? ""
      }`}
      disabled={disabled}
      {...rest}
    >
      <div className="m-auto">{icon}</div>
    </button>
  );
};
