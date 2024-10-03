import type {
  BaseFormBuilderProps,
  GenericFormElementProps,
} from "@components/Form/DynamicForm.js";
import { Input } from "@components/UI/Input.js";
import type { LucideIcon } from "lucide-react";
import { Eye, EyeOff } from "lucide-react";
import type { ChangeEventHandler } from "react";
import { useState } from "react";
import { Controller, type FieldValues } from "react-hook-form";

export interface InputFieldProps<T> extends BaseFormBuilderProps<T> {
  type: "text" | "number" | "password";
  inputChange?: ChangeEventHandler;
  properties?: {
    value?: string;
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
  const [passwordShown, setPasswordShown] = useState(false);
  const togglePasswordVisiblity = () => {
    setPasswordShown(!passwordShown);
  };

  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, onChange, ...rest } }) => (
        <Input
          type={
            field.type === "password" && passwordShown ? "text" : field.type
          }
          action={
            field.type === "password"
              ? {
                  icon: passwordShown ? EyeOff : Eye,
                  onClick: togglePasswordVisiblity,
                }
              : undefined
          }
          step={field.properties?.step}
          value={field.type === "number" ? Number.parseFloat(value) : value}
          onChange={(e) => {
            if (field.inputChange) field.inputChange(e);
            onChange(
              field.type === "number"
                ? Number.parseFloat(e.target.value)
                : e.target.value,
            );
          }}
          {...field.properties}
          {...rest}
          disabled={disabled}
        />
      )}
    />
  );
}
