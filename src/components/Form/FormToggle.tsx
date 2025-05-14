import type {
  BaseFormBuilderProps,
  GenericFormElementProps,
} from "@components/Form/DynamicForm.tsx";
import { Switch } from "@components/UI/Switch.tsx";
import { Controller, type FieldValues } from "react-hook-form";

export interface ToggleFieldProps<T> extends BaseFormBuilderProps<T> {
  type: "toggle";
  inputChange?: (value: boolean) => void;
}

export function ToggleInput<T extends FieldValues>({
  control,
  disabled,
  field,
}: GenericFormElementProps<T, ToggleFieldProps<T>>) {
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, onChange, ...rest } }) => (
        <Switch
          checked={value}
          onCheckedChange={(v) => {
            onChange(v);
            field.inputChange?.(v);
          }}
          id={field.name}
          disabled={disabled}
          {...field.properties}
          {...rest}
        />
      )}
    />
  );
}
