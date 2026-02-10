import { Input } from "@shared/components/ui/input";
import type { ChangeEventHandler } from "react";
import { type FieldValues, useController } from "react-hook-form";
import type {
  BaseFormBuilderProps,
  GenericFormElementProps,
} from "./FormTypes";

export interface InputFieldProps<T> extends BaseFormBuilderProps<T> {
  type: "text" | "number" | "password";
  inputChange?: ChangeEventHandler;
  prefix?: string;
  properties?: {
    id?: string;
    suffix?: string;
    step?: number;
    className?: string;
    fieldLength?: {
      min?: number;
      max?: number;
      currentValueLength?: number;
      showCharacterCount?: boolean;
      /** Count bytes (UTF-8) instead of characters */
      countBytes?: boolean;
    };
    showPasswordToggle?: boolean;
    showCopyButton?: boolean;
  };
}

const encoder = new TextEncoder();

function getByteLength(value: string): number {
  return encoder.encode(value).length;
}

export function GenericInput<T extends FieldValues>({
  control,
  disabled,
  field,
}: GenericFormElementProps<T, InputFieldProps<T>>) {
  const { fieldLength, ...restProperties } = field.properties || {};
  const countBytes = fieldLength?.countBytes ?? false;

  const {
    field: controllerField,
    fieldState: { error, isDirty },
  } = useController({
    name: field.name,
    control,
    rules: {
      minLength: field.properties?.fieldLength?.min,
      maxLength: countBytes ? undefined : field.properties?.fieldLength?.max,
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    if (field.properties?.fieldLength?.max) {
      const len = countBytes ? getByteLength(newValue) : newValue.length;
      if (len > field.properties.fieldLength.max) {
        return;
      }
    }

    if (field.inputChange) {
      field.inputChange(e);
    }

    controllerField.onChange(
      field.type === "number"
        ? Number.parseFloat(newValue).toString()
        : newValue,
    );
  };

  const currentLength = controllerField.value
    ? countBytes
      ? getByteLength(String(controllerField.value))
      : String(controllerField.value).length
    : 0;

  const counterSuffix =
    fieldLength?.showCharacterCount && fieldLength.max
      ? `${currentLength}/${fieldLength.max}`
      : undefined;

  return (
    <Input
      type={field.type}
      step={field.properties?.step}
      value={
        field.type === "number"
          ? String(controllerField.value)
          : controllerField.value
      }
      id={field.name}
      onChange={handleInputChange}
      showCopyButton={field.properties?.showCopyButton}
      showPasswordToggle={
        field.properties?.showPasswordToggle || field.type === "password"
      }
      className={field.properties?.className}
      {...restProperties}
      suffix={counterSuffix ?? restProperties.suffix}
      disabled={disabled}
      variant={error ? "invalid" : isDirty ? "dirty" : "default"}
    />
  );
}
