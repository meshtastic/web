import type {
  BaseFormBuilderProps,
  GenericFormElementProps,
} from "@components/Form/DynamicForm.tsx";
import type { FieldValues } from "react-hook-form";
import { MultiSelect, MultiSelectItem } from "../UI/MultiSelect";

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

export function MultiSelectInput<T extends FieldValues>({
  field,
}: GenericFormElementProps<T, MultiSelectFieldProps<T>>) {
  const { enumValue, formatEnumName, ...remainingProperties } =
    field.properties;

  // Make sure to filter out the UNSET value, as it shouldn't be shown in the UI
  const optionsEnumValues = enumValue
    ? Object.entries(enumValue)
      .filter((value) => typeof value[1] === "number")
      .filter((value) => value[0] !== "UNSET")
    : [];

  const formatName = (name: string) => {
    if (!formatEnumName) return name;
    return name
      .replace(/_/g, " ")
      .toLowerCase()
      .split(" ")
      .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
      .join(" ");
  };

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
          {formatEnumName ? formatName(name) : name}
        </MultiSelectItem>
      ))}
    </MultiSelect>
  );
}
