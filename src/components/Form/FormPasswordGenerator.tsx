import type {
  BaseFormBuilderProps,
  GenericFormElementProps,
} from "@components/Form/DynamicForm.tsx";
import type { ButtonVariant } from "../UI/Button.tsx";
import { Generator } from "@components/UI/Generator.tsx";
import type { ChangeEventHandler } from "react";
import { Controller, type FieldValues } from "react-hook-form";
import { usePasswordVisibilityToggle } from "@core/hooks/usePasswordVisibilityToggle.ts";

export interface PasswordGeneratorProps<T> extends BaseFormBuilderProps<T> {
  type: "passwordGenerator";
  id: string;
  hide?: boolean;
  bits?: { text: string; value: string; key: string }[];
  devicePSKBitCount: number;
  inputChange: ChangeEventHandler<HTMLInputElement> | undefined;
  selectChange: (event: string) => void;
  actionButtons: {
    text: string;
    onClick: React.MouseEventHandler<HTMLButtonElement>;
    variant: ButtonVariant;
    className?: string;
  }[];
  showPasswordToggle?: boolean;
  showCopyButton?: boolean;
}

export function PasswordGenerator<T extends FieldValues>({
  control,
  field,
  disabled,
}: GenericFormElementProps<T, PasswordGeneratorProps<T>>) {
  const { isVisible } = usePasswordVisibilityToggle();

  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, ...rest } }) => (
        <Generator
          type={field.hide && !isVisible ? "password" : "text"}
          id={field.id}
          devicePSKBitCount={field.devicePSKBitCount}
          bits={field.bits}
          inputChange={field.inputChange}
          selectChange={field.selectChange}
          value={value}
          variant={field.validationText ? "invalid" : "default"}
          actionButtons={field.actionButtons}
          showPasswordToggle={field.showPasswordToggle}
          showCopyButton={field.showCopyButton}
          {...field.properties}
          {...rest}
          disabled={disabled}
        />
      )}
    />
  );
}
