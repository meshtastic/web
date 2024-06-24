import type {
  BaseFormBuilderProps,
  GenericFormElementProps,
} from "@components/Form/DynamicForm.js";
import { Input } from "@components/UI/Input.js";
import type { LucideIcon } from "lucide-react";
import { Controller, type FieldValues } from "react-hook-form";

export interface InputFieldProps<T> extends BaseFormBuilderProps<T> {
  type: "text" | "number" | "password";
  properties?: {
    prefix?: string;
    suffix?: string;
    step?: number;
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
          step={field.properties?.step}
          value={field.type === "number" ? Number.parseFloat(value) : value}
          onChange={(e) =>
            onChange(
              field.type === "number"
                ? Number.parseFloat(e.target.value)
                : e.target.value,
            )
          }
          {...field.properties}
          {...rest}
          disabled={disabled}
        />
      )}
    />
  );
}
