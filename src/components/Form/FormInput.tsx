import type {
  BaseFormBuilderProps,
  GenericFormElementProps,
} from "@components/Form/DynamicForm.tsx";
import { Input } from "@components/UI/Input.tsx";
import type { ChangeEventHandler } from "react";
import { useState } from "react";
import { type FieldValues, useController } from "react-hook-form";

export interface InputFieldProps<T> extends BaseFormBuilderProps<T> {
  type: "text" | "number" | "password";
  inputChange?: ChangeEventHandler;
  properties?: {
    value?: string;
    prefix?: string;
    suffix?: string;
    step?: number;
    className?: string;
    fieldLength?: {
      min?: number;
      max?: number;
      currentValueLength?: number;
      showCharacterCount?: boolean;
    };
    showPasswordToggle?: boolean;
    showCopyButton?: boolean;
  };
}

export function GenericInput<T extends FieldValues>({
  control,
  disabled,
  field,
}: GenericFormElementProps<T, InputFieldProps<T>>) {
  const { fieldLength, ...restProperties } = field.properties || {};
  const [currentLength, setCurrentLength] = useState<number>(
    fieldLength?.currentValueLength || 0,
  );

  const { field: controllerField } = useController({
    name: field.name,
    control,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    if (
      field.properties?.fieldLength?.max &&
      newValue.length > field.properties?.fieldLength?.max
    ) {
      return;
    }
    setCurrentLength(newValue.length);

    if (field.inputChange) field.inputChange(e);

    controllerField.onChange(
      field.type === "number"
        ? Number.parseFloat(newValue).toString()
        : newValue,
    );
  };

  return (
    <div className="relative w-full">
      <Input
        type={field.type}
        step={field.properties?.step}
        value={field.type === "number"
          ? String(controllerField.value)
          : controllerField.value}
        id={field.name}
        onChange={handleInputChange}
        showCopyButton={field.properties?.showCopyButton}
        showPasswordToggle={field.properties?.showPasswordToggle ||
          field.type === "password"}
        className={field.properties?.className}
        {...restProperties}
        disabled={disabled}
      />

      {fieldLength?.showCharacterCount && fieldLength?.max && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-slate-900 dark:text-slate-200">
          {currentLength ?? fieldLength?.currentValueLength}/{fieldLength?.max}
        </div>
      )}
    </div>
  );
}
