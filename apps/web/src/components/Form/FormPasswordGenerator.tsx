import type {
  BaseFormBuilderProps,
  GenericFormElementProps,
} from "@components/Form/DynamicForm.tsx";
import { Generator } from "@components/UI/Generator.tsx";
import { usePasswordVisibilityToggle } from "@core/hooks/usePasswordVisibilityToggle.ts";
import { Controller, type FieldValues } from "react-hook-form";
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

  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: controllerField }) => (
        <Generator
          type={field.hide && !isVisible ? "password" : "text"}
          id={field.id}
          devicePSKBitCount={field.devicePSKBitCount}
          bits={field.bits}
          inputChange={(e) => {
            const value = e.target.value;
            field.inputChange?.(e); // call any external handler
            controllerField.onChange(value); // ensure RHF receives just the value
          }}
          selectChange={field.selectChange ?? (() => {})}
          variant={invalid ? "invalid" : isDirty ? "dirty" : "default"}
          actionButtons={field.actionButtons}
          showPasswordToggle={field.showPasswordToggle}
          showCopyButton={field.showCopyButton}
          {...field.properties}
          {...controllerField}
          disabled={disabled}
        />
      )}
    />
  );
}
