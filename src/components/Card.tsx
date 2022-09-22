import type React from "react";

export const Card = ({
  children,
  className,
  ...rest
}: JSX.IntrinsicElements["div"]): JSX.Element => {
  return (
    <div
      className={`flex overflow-hidden rounded-2xl bg-white text-sm text-black shadow-md ${
        className ?? ""
      }`}
      {...rest}
    >
      {children}
    </div>
  );
};
