import { Input } from "../UI/Input.js";
import type {
  BaseFormBuilderProps,
  GenericFormElementProps,
} from "./DynamicForm.js";
import type { LucideIcon } from "lucide-react";
import { Controller, FieldValues } from "react-hook-form";

export interface InputFieldProps<T> extends BaseFormBuilderProps<T> {
  type: "text" | "number" | "password";
  properties?: {
    prefix?: string;
    suffix?: string;
    action?: {
      icon: LucideIcon;
      onClick: () => void;
    };
  };
}

export function GenericInput<T extends FieldValues>({
  control,
  disabled,
  field,
}: GenericFormElementProps<T, InputFieldProps<T>>) {
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, onChange, ...rest } }) => (
        <Input
          type={field.type}
          value={field.type === "number" ? parseInt(value) : value}
          onChange={(e) =>
            onChange(
              field.type === "number"
                ? parseInt(e.target.value)
                : e.target.value,
            )
          }
          disabled={disabled}
          {...field.properties}
          {...rest}
        />
      )}
    />
  );
}
