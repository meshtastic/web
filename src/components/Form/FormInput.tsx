import type {
  BaseFormBuilderProps,
  GenericFormElementProps,
} from "@components/Form/DynamicForm.tsx";
import { Input } from "@components/UI/Input.tsx";
import type { LucideIcon } from "lucide-react";
import { Eye, EyeOff } from "lucide-react";
import type { ChangeEventHandler } from "react";
import { useState } from "react";
import { useController, type FieldValues } from "react-hook-form";

export interface InputFieldProps<T> extends BaseFormBuilderProps<T> {
  type: "text" | "number" | "password";
  inputChange?: ChangeEventHandler;
  properties?: {
    value?: string;
    prefix?: string;
    suffix?: string;
    step?: number;
    fieldLength?: {
      min?: number;
      max?: number;
      currentValueLength?: number;
      showCharacterCount?: boolean;
    },
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
  const { fieldLength, ...restProperties } = field.properties || {};

  const [passwordShown, setPasswordShown] = useState(false);
  const [currentLength, setCurrentLength] = useState<number>(fieldLength?.currentValueLength || 0);

  const { field: controllerField } = useController({
    name: field.name,
    control,
  });

  const togglePasswordVisiblity = () => {
    setPasswordShown(!passwordShown);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    if (field.properties?.fieldLength?.max && newValue.length > field.properties?.fieldLength?.max) {
      return;
    }
    setCurrentLength(newValue.length);

    if (field.inputChange) field.inputChange(e);

    controllerField.onChange(field.type === "number" ? Number.parseFloat(newValue).toString() : newValue);
  };


  return (
    <div className="relative w-full">
      <Input
        type={field.type === "password" && passwordShown ? "text" : field.type}
        action={
          field.type === "password"
            ? {
              icon: passwordShown ? EyeOff : Eye,
              onClick: togglePasswordVisiblity,
            }
            : undefined
        }
        step={field.properties?.step}
        value={field.type === "number" ? String(controllerField.value) : controllerField.value}
        id={field.name}
        onChange={handleInputChange}
        {...restProperties}
        disabled={disabled}
      />

      {fieldLength?.showCharacterCount && fieldLength?.max && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-slate-500 dark:text-slate-400">
          {currentLength ?? fieldLength?.currentValueLength}/{fieldLength?.max}
        </div>
      )}
    </div>
  );
}
