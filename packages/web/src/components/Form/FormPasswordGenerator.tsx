import type {
  BaseFormBuilderProps,
  GenericFormElementProps,
} from "@components/Form/DynamicForm.tsx";
import { Generator } from "@components/UI/Generator.tsx";
import { usePasswordVisibilityToggle } from "@core/hooks/usePasswordVisibilityToggle.ts";
import { useEffect } from "react";
import { Controller, type FieldValues, useFormContext } from "react-hook-form";
import type { ButtonVariant } from "../UI/Button.tsx";

export interface PasswordGeneratorProps<T> extends BaseFormBuilderProps<T> {
  type: "passwordGenerator";
  id: string;
  hide?: boolean;
  bits?: { text: string; value: string; key: string }[];
  devicePSKBitCount: number;
  inputChange?: React.ChangeEventHandler<HTMLInputElement>;
  selectChange?: (event: string) => void;
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
  isDirty,
  invalid,
}: GenericFormElementProps<T, PasswordGeneratorProps<T>>) {
  const { isVisible } = usePasswordVisibilityToggle();
  const { trigger } = useFormContext();

  useEffect(() => {
    trigger(field.name);
  }, [field.name, trigger]);

  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, onChange, ...rest } }) => (
        <Generator
          type={field.hide && !isVisible ? "password" : "text"}
          id={field.id}
          devicePSKBitCount={field.devicePSKBitCount}
          bits={field.bits}
          inputChange={(e) => {
            if (field.inputChange) {
              field.inputChange(e);
            }
            onChange(e);
          }}
          selectChange={field.selectChange ?? (() => {})}
          value={value}
          variant={invalid ? "invalid" : isDirty ? "dirty" : "default"}
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
