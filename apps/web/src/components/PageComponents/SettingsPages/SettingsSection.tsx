import { SettingsCard } from "@components/Settings/SettingsCard.tsx";
import { SettingsFieldRow } from "@components/Settings/SettingsFieldRow.tsx";
import type { ReactNode } from "react";

/** The stack of cards on a settings page. */
export const SettingsSections = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col gap-5">{children}</div>
);

interface SettingsGroupProps {
  title: string;
  description?: ReactNode;
  /** `danger` for the red Danger zone card. */
  tone?: "default" | "danger";
  children?: ReactNode;
}

/** A titled card of rows, matching a DynamicForm field group. */
export const SettingsGroup = ({
  title,
  description,
  tone,
  children,
}: SettingsGroupProps) => (
  <SettingsCard title={title} description={description} tone={tone}>
    {children}
  </SettingsCard>
);

interface SettingsRowProps {
  label: string;
  /** Id of the control, so the label focuses it. */
  htmlFor?: string;
  description?: ReactNode;
  /** Put the control under the label, for wide controls. */
  stacked?: boolean;
  children?: ReactNode;
}

/** A label, description and control, laid out like a form field row. */
export const SettingsRow = ({
  label,
  htmlFor,
  description,
  stacked,
  children,
}: SettingsRowProps) => (
  <SettingsFieldRow
    label={label}
    htmlFor={htmlFor}
    help={description}
    stacked={stacked}
  >
    {children}
  </SettingsFieldRow>
);

/** Free content inside a settings card (lists, logs), padded like a row. */
export const SettingsBlock = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col gap-3 border-t border-subtle px-4 py-3.5 first:border-t-0">
    {children}
  </div>
);
