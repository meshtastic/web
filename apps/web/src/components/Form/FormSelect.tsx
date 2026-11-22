import { settingRowDescribedBy } from "@components/UI/SettingRow.tsx";
import type {
  BaseFormBuilderProps,
  GenericFormElementProps,
} from "@components/Form/DynamicForm.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/UI/Select.tsx";
import { cn } from "@core/utils/cn.ts";
import { type FieldValues, useController } from "react-hook-form";

export interface SelectFieldProps<T> extends BaseFormBuilderProps<T> {
  type: "select";
  selectChange?: (e: string, name: string) => void;
  validate?: (newValue: string) => Promise<boolean>;
  defaultValue?: string;
  properties: BaseFormBuilderProps<T>["properties"] & {
    defaultValue?: T;
    enumValue: {
      [s: string]: string | number;
    };
    formatEnumName?: boolean;
    /** Text appended to an option's label, keyed by option value. */
    optionSuffixes?: Record<number, string>;
  };
}

const formatEnumDisplay = (name: string): string => {
  return name
    .replace(/_/g, " ")
    .toLowerCase()
    .split(" ")
    .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
    .join(" ");
};

export function SelectInput<T extends FieldValues>({
  control,
  disabled,
  field,
  isDirty,
  invalid,
}: GenericFormElementProps<T, SelectFieldProps<T>>) {
  const {
    field: { value, onChange, ref, onBlur, ...rest },
  } = useController({
    name: field.name,
    control,
  });

  const {
    enumValue,
    formatEnumName,
    optionSuffixes,
    defaultValue,
    className,
    ...remainingProperties
  } = field.properties;
  const valueToKeyMap: Record<string, string> = {};
  const optionsEnumValues: [string, number][] = [];

  if (enumValue) {
    Object.entries(enumValue).forEach(([key, val]) => {
      if (typeof val === "number") {
        valueToKeyMap[val.toString()] = key;
        optionsEnumValues.push([key, val]);
      }
    });
  }

  const handleValueChange = async (newValue: string) => {
    const selectedKey = valueToKeyMap[newValue];
    if (!selectedKey) {
      return;
    }

    if (field.validate) {
      const isValid = await field.validate(selectedKey);
      if (!isValid) {
        return;
      }
    }

    if (field.selectChange) {
      field.selectChange(newValue, selectedKey);
    }
    onChange(Number.parseInt(newValue, 10));
  };

  return (
    <Select
      onValueChange={handleValueChange}
      disabled={disabled}
      value={value?.toString()}
      defaultValue={defaultValue?.toString()}
      {...rest}
    >
      <SelectTrigger
        id={field.name}
        aria-describedby={settingRowDescribedBy(field.name, {
          help: Boolean(field.description),
          error: invalid,
        })}
        className={cn([
          "w-full sm:w-auto sm:min-w-60",
          className,
          isDirty && "border-dirty",
          invalid && "border-danger-strong",
        ])}
        ref={ref}
        onBlur={onBlur}
        {...remainingProperties}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {optionsEnumValues.map(([name, val]) => (
          <SelectItem key={name} value={val.toString()}>
            {formatEnumName ? formatEnumDisplay(name) : name}
            {optionSuffixes?.[val] ? ` ${optionSuffixes[val]}` : null}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
