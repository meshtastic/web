import type {
  BaseFormBuilderProps,
  GenericFormElementProps,
} from "@components/Form/DynamicForm.tsx";
import type { ButtonVariant } from "../UI/Button.tsx";
import { Generator } from "@components/UI/Generator.tsx";
import { Eye, EyeOff } from "lucide-react";
import type { ChangeEventHandler } from "react";
import { useState } from "react";
import { Controller, type FieldValues } from "react-hook-form";

export interface PasswordGeneratorProps<T> extends BaseFormBuilderProps<T> {
  type: "passwordGenerator";
  id: string;
  hide?: boolean;
  bits?: { text: string; value: string; key: string }[];
  devicePSKBitCount: number;
  inputChange: ChangeEventHandler;
  selectChange: (event: string) => void;
  actionButtons: {
    text: string;
    onClick: React.MouseEventHandler<HTMLButtonElement>;
    variant: ButtonVariant;
    className?: string;
  }[];
}

export function PasswordGenerator<T extends FieldValues>({
  control,
  field,
  disabled,
}: GenericFormElementProps<T, PasswordGeneratorProps<T>>) {
  const [passwordShown, setPasswordShown] = useState(false);
  const togglePasswordVisiblity = () => {
    setPasswordShown(!passwordShown);
  };

  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, ...rest } }) => (
        <Generator
          type={field.hide && !passwordShown ? "password" : "text"}
          id={field.id}
          action={field.hide
            ? {
              icon: passwordShown ? EyeOff : Eye,
              onClick: togglePasswordVisiblity,
            }
            : undefined}
          devicePSKBitCount={field.devicePSKBitCount}
          bits={field.bits}
          inputChange={field.inputChange}
          selectChange={field.selectChange}
          value={value}
          variant={field.validationText ? "invalid" : "default"}
          actionButtons={field.actionButtons}
          {...field.properties}
          {...rest}
          disabled={disabled}
        />
      )}
    />
  );
}
