import type React from "react";

export const Card = ({
  children,
  className,
  ...rest
}: JSX.IntrinsicElements["div"]): JSX.Element => {
  return (
    <div
      className={`flex overflow-hidden rounded-md bg-white text-sm text-black shadow-md ${
        className ?? ""
      }`}
      {...rest}
    >
      {children}
    </div>
  );
};
