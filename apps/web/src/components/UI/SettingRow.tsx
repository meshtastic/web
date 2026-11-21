import { Button } from "@components/UI/Button.tsx";
import { CopyField } from "@components/UI/CopyField.tsx";
import { Input } from "@components/UI/Input.tsx";
import { Segmented, type SegmentedOption } from "@components/UI/Segmented.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/UI/Select.tsx";
import { StatusDot } from "@components/UI/StatusDot.tsx";
import { Switch } from "@components/UI/Switch.tsx";
import { cn } from "@core/utils/cn.ts";
import type { TextLimitSpec } from "@core/utils/textLimit.ts";
import { type ReactElement, type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";

export interface SettingOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly disabled?: boolean;
}

interface SettingRowBase {
  label: string;
  help?: ReactNode;
  /** Validation message under the help text, in red. */
  error?: ReactNode;
  /** Edited but not saved: amber control border. */
  dirty?: boolean;
  disabled?: boolean;
  className?: string;
}

export interface SwitchSettingRow extends SettingRowBase {
  kind: "switch";
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export interface SelectSettingRow<T extends string> extends SettingRowBase {
  kind: "select";
  value: NoInfer<T>;
  options: readonly SettingOption<T>[];
  onValueChange: (value: NoInfer<T>) => void;
  placeholder?: string;
}

export interface TextSettingRow extends SettingRowBase {
  kind: "text";
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** Live counter. Radio fields (long/short name, status) count bytes. */
  limit?: TextLimitSpec;
  width?: "sm" | "md" | "lg";
  /** Monospace, for numbers and addresses. */
  mono?: boolean;
  inputMode?: "text" | "numeric" | "decimal" | "url";
}

export interface SegmentedSettingRow<T extends string> extends SettingRowBase {
  kind: "segmented";
  value: NoInfer<T>;
  options: readonly SegmentedOption<T>[];
  onValueChange: (value: NoInfer<T>) => void;
}

export interface ReadonlyKeySettingRow extends SettingRowBase {
  kind: "readonlyKey";
  value: string;
  copyable?: boolean;
  /** What Copy copies, when `value` is masked. */
  copyValue?: string;
  /** The value fills the row, on its own line under the label. */
  fill?: boolean;
  /** Buttons after Copy, e.g. Regenerate. */
  actions?: ReactNode;
}

export interface ButtonSettingRow extends SettingRowBase {
  kind: "button";
  actionLabel: string;
  onAction: () => void;
  /** `danger` for destructive actions (pair with ConfirmDialog). */
  tone?: "default" | "danger";
}

export interface CustomSettingRow extends SettingRowBase {
  kind: "custom";
  /** The control, e.g. a form-bound input. */
  children: ReactNode;
  /** Id of a labelable control, so the label points at it. */
  controlId?: string;
  /** Put the control under the label, for wide controls (lists, sliders). */
  stacked?: boolean;
}

/**
 * One settings row: label and help on the left, a control on the right.
 * `kind` selects the control; select and segmented rows are generic over
 * their option values.
 */
export type SettingRowProps<T extends string = string> =
  | SwitchSettingRow
  | SelectSettingRow<T>
  | TextSettingRow
  | SegmentedSettingRow<T>
  | ReadonlyKeySettingRow
  | ButtonSettingRow
  | CustomSettingRow;

const textWidth = {
  sm: "w-[100px]",
  md: "w-[160px]",
  lg: "w-full sm:w-[320px]",
} as const;

interface ControlIds {
  control: string;
  label: string;
  /** Help and error ids, for aria-describedby. */
  help: string | undefined;
}

const SettingControl = <T extends string>({
  row,
  ids,
}: {
  row: SettingRowProps<T>;
  ids: ControlIds;
}): ReactElement => {
  const dirty = row.dirty === true;
  switch (row.kind) {
    case "switch":
      return (
        <Switch
          id={ids.control}
          checked={row.checked}
          onCheckedChange={row.onCheckedChange}
          disabled={row.disabled}
          aria-describedby={ids.help}
          className={cn(dirty && "outline-2 outline-offset-2 outline-dirty")}
        />
      );
    case "select":
      return (
        <Select
          value={row.value}
          disabled={row.disabled}
          onValueChange={(next) => {
            const option = row.options.find((o) => o.value === next);
            if (option) {
              row.onValueChange(option.value);
            }
          }}
        >
          <SelectTrigger
            id={ids.control}
            aria-describedby={ids.help}
            className={cn(
              "w-full sm:w-auto sm:min-w-60",
              dirty && "border-dirty",
            )}
          >
            <SelectValue placeholder={row.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {row.options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "text":
      return (
        <Input
          id={ids.control}
          value={row.value}
          onChange={(event) => row.onValueChange(event.target.value)}
          placeholder={row.placeholder}
          disabled={row.disabled}
          inputMode={row.inputMode}
          limit={row.limit}
          variant={row.error ? "invalid" : dirty ? "dirty" : "default"}
          aria-describedby={ids.help}
          containerClassName={textWidth[row.width ?? "lg"]}
          className={cn(row.mono && "font-mono")}
        />
      );
    case "segmented":
      return (
        <Segmented
          value={row.value}
          options={row.options}
          onValueChange={row.onValueChange}
          disabled={row.disabled}
          dirty={dirty}
          aria-labelledby={ids.label}
          aria-describedby={ids.help}
          className="flex-wrap"
        />
      );
    case "readonlyKey":
      return (
        <CopyField
          value={row.value}
          label={row.label}
          copyable={row.copyable ?? true}
          {...(row.copyValue === undefined ? {} : { copyValue: row.copyValue })}
          fill={row.fill === true}
          className={row.fill === true ? "w-full" : undefined}
          actions={row.actions}
        />
      );
    case "button":
      return (
        <>
          {dirty ? <StatusDot status="dirty" size="sm" label={null} /> : null}
          <Button
            id={ids.control}
            variant={row.tone === "danger" ? "danger" : "secondary"}
            disabled={row.disabled}
            onClick={row.onAction}
            aria-describedby={[ids.label, ids.help].filter(Boolean).join(" ")}
            className="text-help font-semibold"
          >
            {row.actionLabel}
          </Button>
        </>
      );
    case "custom":
      return <>{row.children}</>;
    default: {
      const unhandled: never = row;
      return unhandled;
    }
  }
};

/**
 * `aria-describedby` for a custom row's control: its help and error ids,
 * which a custom row derives from `controlId`.
 */
export const settingRowDescribedBy = (
  controlId: string,
  { help, error }: { help?: boolean; error?: boolean },
): string | undefined =>
  [help && `${controlId}-help`, error && `${controlId}-error`]
    .filter(Boolean)
    .join(" ") || undefined;

export const SettingRow = <T extends string = string>(
  props: SettingRowProps<T>,
) => {
  const { t } = useTranslation("ui");
  const generatedId = useId();
  // A custom row's control sets its own aria-describedby, so the help and
  // error ids follow its id (see settingRowDescribedBy).
  const baseId =
    props.kind === "custom" && props.controlId ? props.controlId : generatedId;
  const helpId = props.help ? `${baseId}-help` : undefined;
  const errorId = props.error ? `${baseId}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
  const ids: ControlIds = {
    control: `${baseId}-control`,
    label: `${baseId}-label`,
    help: describedBy,
  };
  // Labels point at the control when it is a single labelable element.
  const labelFor =
    props.kind === "switch" || props.kind === "select" || props.kind === "text"
      ? ids.control
      : props.kind === "custom"
        ? props.controlId
        : undefined;
  const stacked =
    (props.kind === "custom" && props.stacked === true) ||
    (props.kind === "readonlyKey" && props.fill === true);

  return (
    <div
      data-dirty={props.dirty || undefined}
      className={cn(
        "flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-subtle px-4 py-3.5 first:border-t-0",
        props.className,
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col gap-0.5",
          stacked ? "w-full" : "flex-[1_1_260px]",
        )}
      >
        {labelFor ? (
          <label id={ids.label} htmlFor={labelFor} className="font-medium">
            {props.label}
          </label>
        ) : (
          <span id={ids.label} className="font-medium">
            {props.label}
          </span>
        )}
        {/* Outside the label, so the control's accessible name stays the label. */}
        {props.dirty ? (
          <span className="sr-only"> ({t("primitives.unsavedChanges")})</span>
        ) : null}
        {props.help ? (
          <span id={helpId} className="text-help leading-snug text-muted">
            {props.help}
          </span>
        ) : null}
        {props.error ? (
          <span id={errorId} className="text-help leading-snug text-danger">
            {props.error}
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "flex min-w-0 flex-wrap items-center gap-2",
          stacked ? "w-full" : "flex-[0_1_auto]",
        )}
      >
        <SettingControl row={props} ids={ids} />
      </div>
    </div>
  );
};
