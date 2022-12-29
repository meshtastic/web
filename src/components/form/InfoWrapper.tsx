import type React from "react";

import { ExclamationCircleIcon } from "@heroicons/react/24/outline";

export interface InfoWrapperProps {
  label?: string;
  description?: string;
  error?: string;
  children: React.ReactNode;
}

export const InfoWrapper = ({
  label,
  description,
  error,
  children
}: InfoWrapperProps): JSX.Element => {
  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-textPrimary">
          {label}
        </label>
      )}
      {/*  */}
      {children}
      {error && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <ExclamationCircleIcon className="text-red-500 h-5 w-5" />
        </div>
      )}
      {description && (
        <p className="mt-2 text-sm text-textSecondary">{description}</p>
      )}
      {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
    </div>
  );
};
