import type {
  BaseFormBuilderProps,
  GenericFormElementProps,
} from "@components/Form/DynamicForm.js";
import { Generator } from "@components/UI/Generator.js";
import type { ChangeEventHandler, MouseEventHandler } from "react";
import { Controller, type FieldValues } from "react-hook-form";

export interface PasswordGeneratorProps<T> extends BaseFormBuilderProps<T> {
  type: "passwordGenerator";
  hide?: boolean;
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
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, ...rest } }) => (
        <Generator
          hide={field.hide}
          devicePSKBitCount={field.devicePSKBitCount}
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
