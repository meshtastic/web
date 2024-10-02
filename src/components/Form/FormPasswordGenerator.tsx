import type {
  BaseFormBuilderProps,
  GenericFormElementProps,
} from "@components/Form/DynamicForm.js";
import { Generator } from "@components/UI/Generator.js";
import type { ChangeEventHandler, MouseEventHandler } from "react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Controller, type FieldValues } from "react-hook-form";

export interface PasswordGeneratorProps<T> extends BaseFormBuilderProps<T> {
  type: "passwordGenerator";
  hide?: boolean;
  bits?: { text: string; value: string; key: string }[];
  devicePSKBitCount: number;
  inputChange: ChangeEventHandler;
  selectChange: (event: string) => void;
  buttonClick: MouseEventHandler;
}

export function PasswordGenerator<T extends FieldValues>({
  control,
  field,
  disabled,
}: GenericFormElementProps<T, PasswordGeneratorProps<T>>) {
  
  const [passwordShown, setPasswordShown] = useState(false);
  const togglePasswordVisiblity = () => {
    setPasswordShown(passwordShown ? false : true);
  };

  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, ...rest } }) => (
        <Generator
          type={field.hide && !passwordShown ? "password" : "text"}
          action={field.hide ? {
            icon: passwordShown ? EyeOff : Eye,
            onClick: togglePasswordVisiblity
          } : undefined}
          devicePSKBitCount={field.devicePSKBitCount}
          bits={field.bits}
          inputChange={field.inputChange}
          selectChange={field.selectChange}
          buttonClick={field.buttonClick}
          value={value}
          variant={field.validationText ? "invalid" : "default"}
          buttonText="Generate"
          {...field.properties}
          {...rest}
          disabled={disabled}
        />
      )}
    />
  );
}
