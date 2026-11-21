import { SettingRow } from "@components/UI/SettingRow.tsx";
import type { ReactNode } from "react";

export interface SettingsFieldRowProps {
  label: string;
  /** Id of the control, so clicking the label focuses it. */
  htmlFor?: string;
  help?: ReactNode;
  /** Validation message, shown under the help text in red. */
  error?: ReactNode;
  dirty?: boolean;
  /** Stack the control under the label (wide controls: lists, sliders). */
  stacked?: boolean;
  children?: ReactNode;
  className?: string;
}

/**
 * A settings row whose control is supplied by the caller (form-bound
 * inputs, multi-selects, key generators): the UI `SettingRow` with a
 * custom control.
 */
export const SettingsFieldRow = ({
  label,
  htmlFor,
  help,
  error,
  dirty,
  stacked,
  children,
  className,
}: SettingsFieldRowProps) => (
  <SettingRow
    kind="custom"
    label={label}
    controlId={htmlFor}
    help={help}
    error={error}
    dirty={dirty}
    stacked={stacked}
    className={className}
  >
    {children}
  </SettingRow>
);
