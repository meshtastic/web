import type {
  BaseFormBuilderProps,
  GenericFormElementProps,
} from "@components/Form/DynamicForm.tsx";
import type { FieldValues } from "react-hook-form";
import { MultiSelect, MultiSelectItem } from "../UI/MultiSelect.tsx";

export interface MultiSelectFieldProps<T> extends BaseFormBuilderProps<T> {
  type: "multiSelect";
  placeholder?: string;
  onValueChange: (name: string) => void;
  isChecked: (name: string) => boolean;
  value: string[];
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

export function MultiSelectInput<T extends FieldValues>({
  field,
}: GenericFormElementProps<T, MultiSelectFieldProps<T>>) {
  const { enumValue, formatEnumName, ...remainingProperties } =
    field.properties;

  const valueToKeyMap: Record<string, string> = {};
  const optionsEnumValues: [string, number][] = [];

  if (enumValue) {
    Object.entries(enumValue).forEach(([key, val]) => {
      if (typeof val === "number" && key !== "UNSET") {
        valueToKeyMap[val.toString()] = key;
        optionsEnumValues.push([key, val as number]);
      }
    });
  }

  return (
    <MultiSelect {...remainingProperties}>
      {optionsEnumValues.map(([name, value]) => (
        <MultiSelectItem
          key={name}
          name={name}
          value={value.toString()}
          checked={field.isChecked(name)}
          onCheckedChange={() => field.onValueChange(name)}
        >
          {formatEnumName ? formatEnumDisplay(name) : name}
        </MultiSelectItem>
      ))}
    </MultiSelect>
  );
}
