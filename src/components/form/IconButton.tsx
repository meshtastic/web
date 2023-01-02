import type React from "react";
import type { ButtonHTMLAttributes } from "react";

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
  icon?: JSX.Element;
}

export const IconButton = ({
  size = "md",
  icon,
  disabled,
  className,
  ...rest
}: IconButtonProps): JSX.Element => {
  return (
    <button
      className={`flex rounded-md bg-accentMuted text-textPrimary hover:text-accent hover:brightness-hover focus:outline-none active:brightness-press ${
        size === "sm" ? "h-8 w-8" : size === "md" ? "h-10 w-10" : "h-12 w-12"
      } ${
        disabled
          ? "cursor-not-allowed text-textSecondary brightness-disabled hover:brightness-disabled"
          : ""
      } ${className ?? ""}`}
      disabled={disabled}
      {...rest}
    >
      <div className="m-auto">{icon}</div>
    </button>
  );
};
