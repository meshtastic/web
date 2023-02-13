import type {
  BaseFormBuilderProps,
  GenericFormElementProps
} from "./DynamicForm.js";
import { Controller, FieldValues } from "react-hook-form";
import { Switch } from "../UI/Switch.js";

export interface ToggleFieldProps<T> extends BaseFormBuilderProps<T> {
  type: "toggle";
}

export function ToggleInput<T extends FieldValues>({
  control,
  disabled,
  field
}: GenericFormElementProps<T, ToggleFieldProps<T>>) {
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, onChange, ...rest } }) => (
        <Switch
          checked={value}
          onCheckedChange={onChange}
          disabled={disabled}
          {...field.properties}
          {...rest}
        />
      )}
    />
  );
}
