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
import { useController, type FieldValues } from "react-hook-form";

export interface SelectFieldProps<T> extends BaseFormBuilderProps<T> {
  type: "select";
  selectChange?: (e: string, name: string) => void;
  onBeforeChange?: (newValue: string, prevValue: string) => Promise<string | false>;
  properties: BaseFormBuilderProps<T>["properties"] & {
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

  const { enumValue, formatEnumName, ...remainingProperties } = field.properties;
  const valueToKeyMap: Record<string, string> = {};
  const keyToValueMap: Record<string, number> = {};
  const optionsEnumValues: [string, number][] = [];

  if (enumValue) {
    Object.entries(enumValue).forEach(([key, val]) => {
      if (typeof val === "number") {
        valueToKeyMap[val.toString()] = key; // Map enum value to key
        keyToValueMap[key] = val; // Map key to enum value
        optionsEnumValues.push([key, val]);
      }
    });
  }

  const handleValueChange = async (newValue: string) => {
    const selectedKey = valueToKeyMap[newValue];
    if (!selectedKey) return;

    if (field.onBeforeChange) {
      try {
        const result = await field.onBeforeChange(selectedKey, valueToKeyMap[value?.toString()]);

        if (result === false) return;
        const updatedValue = keyToValueMap[result];
        if (updatedValue !== undefined) {
          if (field.selectChange) field.selectChange(updatedValue.toString(), result);
          onChange(updatedValue);
        }
      } catch (error) {
        console.error("Error in onBeforeChange function:", error);
      }
    } else {
      if (field.selectChange) field.selectChange(newValue, selectedKey);
      onChange(Number.parseInt(newValue));
    }
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
