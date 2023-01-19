import type React from "react";
import { forwardRef, InputHTMLAttributes, useEffect } from "react";

import { InfoWrapper, InfoWrapperProps } from "@components/form/InfoWrapper.js";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import type { InputProps } from "./Input.js";

export const IPInput = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    description,
    prefix,
    suffix,
    action,
    error,
    disabled,
    value,
    ...rest
  }: InputProps,
  ref
) {
  const [numericalValue, setNumericalValue] = useState<number>();
  const [facadeInputValue, setFacadeInputValue] = useState<string>();

  useEffect(() => {
    if (typeof value === "number") {
      setFacadeInputValue(
        value
          .toString(16)
          .match(/.{1,3}/g)
          ?.map((v) => parseInt(v, 10))
          ?.join(".")
      );
    }
  }, [value]);

  return (
    <InfoWrapper label={label} description={description} error={error}>
      <div className="relative flex rounded-md">
        <input
          value={numericalValue}
          onChange={(e) => setNumericalValue(parseInt(e.target.value))}
          ref={ref}
          hidden
        />
        <input
          value={facadeInputValue}
          onChange={(e) => {
            setFacadeInputValue(e.target.value);
            setNumericalValue(
              parseInt(
                e.target.value
                  .split(".")
                  .map((v) => parseInt(v).toString(16))
                  .join(""),
                16
              )
            );
          }}
          className={`flex h-10 w-full rounded-md border-none bg-backgroundPrimary px-3 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-accent ${
            prefix ? "rounded-l-none" : ""
          } ${action ? "rounded-r-none" : ""} ${
            disabled
              ? "cursor-not-allowed text-textSecondary brightness-disabled hover:brightness-disabled"
              : ""
          }`}
          disabled={disabled}
          step="any"
          {...rest}
        />
      </div>
    </InfoWrapper>
  );
});
