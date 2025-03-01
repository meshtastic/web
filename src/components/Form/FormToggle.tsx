import type {
  BaseFormBuilderProps,
  GenericFormElementProps,
} from "@components/Form/DynamicForm.tsx";
import { Switch } from "@components/UI/Switch.tsx";
import type { ChangeEvent } from "react";
import { Controller, type FieldValues } from "react-hook-form";

export interface ToggleFieldProps<T> extends BaseFormBuilderProps<T> {
  type: "toggle";
}

export function ToggleInput<T extends FieldValues>({
  control,
  disabled,
  field,
}: GenericFormElementProps<T, ToggleFieldProps<T>>) {
  const onChangeHandler = (e: (event: ChangeEvent) => void) => {
    return (value: boolean) => {
      e({
        target: {
          value: value,
        },
      } as unknown as ChangeEvent);
    };
  };

  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, onChange, ...rest } }) => (
        <Switch
          checked={value}
          onCheckedChange={onChangeHandler(onChange)}
          id={field.name}
          disabled={disabled}
          {...field.properties}
          {...rest}
        />
      )}
    />
  );
}
