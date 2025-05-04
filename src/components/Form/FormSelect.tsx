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
}: GenericFormElementProps<T, SelectFieldProps<T>>) {
  const {
    field: { value, onChange, ...rest },
  } = useController({
    name: field.name,
    control,
  });

  const { enumValue, formatEnumName, ...remainingProperties } =
    field.properties;
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

    if (field.validate) {
      const isValid = await field.validate(selectedKey);
      if (!isValid) return;
    }

    if (field.selectChange) field.selectChange(newValue, selectedKey);
    onChange(Number.parseInt(newValue));
  };

  return (
    <Select
      onValueChange={handleValueChange}
      disabled={disabled}
      value={value?.toString()}
      {...remainingProperties}
      {...rest}
    >
      <SelectTrigger id={field.name}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {optionsEnumValues.map(([name, val]) => (
          <SelectItem key={name} value={val.toString()}>
            {formatEnumName ? formatEnumDisplay(name) : name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
