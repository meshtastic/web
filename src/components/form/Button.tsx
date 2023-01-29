import type { ButtonHTMLAttributes, ComponentType, SVGProps } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
}

export const Button = ({
  size = "md",
  children,
  disabled,
  className,
  ...rest
}: ButtonProps): JSX.Element => {
  return (
    <button
      className={`flex w-full select-none rounded-md bg-accentMuted px-3 text-textPrimary hover:brightness-hover focus:outline-none active:brightness-press ${
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
        {children}
      </div>
    </button>
  );
};
