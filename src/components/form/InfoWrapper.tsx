import { AlertCircleIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface InfoWrapperProps {
  label?: string;
  description?: string;
  error?: string;
  children: ReactNode;
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
          <AlertCircleIcon size={16} className="text-red-500" />
        </div>
      )}
      {description && (
        <p className="mt-2 text-sm text-textSecondary">{description}</p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
};
