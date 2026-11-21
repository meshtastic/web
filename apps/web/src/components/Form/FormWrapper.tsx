import { SettingsFieldRow } from "@components/Settings/SettingsFieldRow.tsx";
import type { ReactNode } from "react";

export interface FieldWrapperProps {
  label: string;
  fieldName: string;
  description?: string;
  disabled?: boolean;
  children?: ReactNode;
  valid?: boolean;
  validationText?: string;
  /** Edited but not saved. */
  dirty?: boolean;
  /** Put the control under the label, for wide controls. */
  stacked?: boolean;
}

/** One form field as a settings row: label and help left, control right. */
export const FieldWrapper = ({
  label,
  fieldName,
  description,
  children,
  valid,
  validationText,
  dirty,
  stacked,
}: FieldWrapperProps) => (
  <SettingsFieldRow
    label={label}
    htmlFor={fieldName}
    help={description}
    error={valid === false && validationText ? validationText : undefined}
    dirty={dirty}
    stacked={stacked}
  >
    {children}
  </SettingsFieldRow>
);
