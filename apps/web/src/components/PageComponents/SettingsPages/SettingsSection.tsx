import { Label } from "@components/UI/Label.tsx";
import { Heading } from "@components/UI/Typography/Heading.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import { cn } from "@core/utils/cn.ts";
import type { ReactNode } from "react";

/** The stack of groups on a settings page, spaced like DynamicForm. */
export const SettingsSections = ({ children }: { children: ReactNode }) => (
  <div className="space-y-8">{children}</div>
);

interface SettingsGroupProps {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}

/** A titled group of rows, matching a DynamicForm field group. */
export const SettingsGroup = ({
  title,
  description,
  children,
}: SettingsGroupProps) => (
  <section className="space-y-8 sm:space-y-5">
    <div>
      <Heading as="h4" className="font-medium">
        {title}
      </Heading>
      {description && <Subtle>{description}</Subtle>}
    </div>
    {children}
  </section>
);

interface SettingsRowProps {
  label: string;
  /** Id of the control, so the label focuses it. */
  htmlFor?: string;
  description?: ReactNode;
  destructive?: boolean;
  children?: ReactNode;
}

/** A label, description and control, laid out like FieldWrapper. */
export const SettingsRow = ({
  label,
  htmlFor,
  description,
  destructive,
  children,
}: SettingsRowProps) => (
  <div className="pt-6 sm:pt-5">
    <div className="grid grid-cols-1 lg:grid-cols-[0.6fr_2fr_.1fr] sm:items-baseline gap-4">
      <Label
        htmlFor={htmlFor}
        className={cn(destructive && "text-red-600 dark:text-red-400")}
      >
        {label}
      </Label>
      <div className="max-w-3xl">
        {description && (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {description}
          </div>
        )}
        {children && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  </div>
);
