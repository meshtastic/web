import type {
  BaseFormBuilderProps,
  GenericFormElementProps,
} from "@components/Form/DynamicForm.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/UI/Select.js";
import { Controller, FieldValues } from "react-hook-form";

export interface SelectFieldProps<T> extends BaseFormBuilderProps<T> {
  type: "select" | "multiSelect";
  properties: BaseFormBuilderProps<T>["properties"] & {
    enumValue: {
      [s: string]: string | number;
    };
    formatEnumName?: boolean;
  };
}

export function SelectInput<T extends FieldValues>({
  control,
  disabled,
  field,
}: GenericFormElementProps<T, SelectFieldProps<T>>) {
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, onChange, ...rest } }) => {
        const { enumValue, formatEnumName, ...remainingProperties } =
          field.properties;
        const optionsEnumValues = enumValue
          ? Object.entries(enumValue).filter(
              (value) => typeof value[1] === "number",
            )
          : [];
        return (
          <Select
            onValueChange={(e) => onChange(parseInt(e))}
            disabled={disabled}
            value={value?.toString()}
            {...remainingProperties}
            {...rest}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {optionsEnumValues.map(([name, value]) => (
                <SelectItem key={name} value={value.toString()}>
                  {formatEnumName
                    ? name
                        .replace(/_/g, " ")
                        .toLowerCase()
                        .split(" ")
                        .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
                        .join(" ")
                    : name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }}
    />
  );
}
