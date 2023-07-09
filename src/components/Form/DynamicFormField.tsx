import type { Control, FieldValues } from "react-hook-form";
import { GenericInput, InputFieldProps } from "./FormInput.js";
import { ToggleFieldProps, ToggleInput } from "./FormToggle.js";
import { SelectFieldProps, SelectInput } from "./FormSelect.js";

export type FieldProps<T> =
  | InputFieldProps<T>
  | SelectFieldProps<T>
  | ToggleFieldProps<T>;

export interface DynamicFormFieldProps<T extends FieldValues> {
  field: FieldProps<T>;
  control: Control<T>;
  disabled?: boolean;
}

export function DynamicFormField<T extends FieldValues>({
  field,
  control,
  disabled,
}: DynamicFormFieldProps<T>) {
  switch (field.type) {
    case "text":
    case "password":
    case "number":
      return (
        <GenericInput field={field} control={control} disabled={disabled} />
      );

    case "toggle":
      return (
        <ToggleInput field={field} control={control} disabled={disabled} />
      );
    case "select":
      return (
        <SelectInput field={field} control={control} disabled={disabled} />
      );
    case "multiSelect":
      return <div>tmp</div>;
  }
}
