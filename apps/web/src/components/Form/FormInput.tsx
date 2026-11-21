import { settingRowDescribedBy } from "@components/UI/SettingRow.tsx";
import type {
  BaseFormBuilderProps,
  GenericFormElementProps,
} from "@components/Form/DynamicForm.tsx";
import { Input } from "@components/UI/Input.tsx";
import type { TextLimitSpec } from "@core/utils/textLimit.ts";
import type { ChangeEventHandler } from "react";
import { type FieldValues, useController } from "react-hook-form";

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
    };
    showPasswordToggle?: boolean;
    showCopyButton?: boolean;
    /**
     * Live `used/max` counter that turns red when over, without blocking
     * input (validation reports it). Radio strings count UTF-8 bytes.
     */
    limit?: TextLimitSpec;
  };
}

export function GenericInput<T extends FieldValues>({
  control,
  disabled,
  field,
}: GenericFormElementProps<T, InputFieldProps<T>>) {
  const { fieldLength, limit, ...restProperties } = field.properties || {};
  // A byte/char `limit` shows a counter and lets validation report the
  // overflow; the older `fieldLength` caps typing at a character count.
  const blockingLength = limit ? undefined : fieldLength;
  const counterLimit: TextLimitSpec | undefined =
    limit ??
    (fieldLength?.showCharacterCount && fieldLength.max
      ? { max: fieldLength.max, mode: "chars" }
      : undefined);

  const {
    field: controllerField,
    fieldState: { error, isDirty },
  } = useController({
    name: field.name,
    control,
    rules: {
      minLength: blockingLength?.min,
      maxLength: blockingLength?.max,
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    if (blockingLength?.max && newValue.length > blockingLength.max) {
      return;
    }

    if (field.inputChange) {
      field.inputChange(e);
    }

    // Forward the raw string so partial input like "-" or "0." isn't
    // mangled mid-type; the schema coerces on submit.
    controllerField.onChange(newValue);
  };

  const value =
    controllerField.value === undefined || controllerField.value === null
      ? ""
      : String(controllerField.value);

  return (
    <div className="relative w-full sm:w-[320px]">
      <Input
        type={field.type}
        step={field.properties?.step}
        value={value}
        limit={counterLimit}
        id={field.name}
        onChange={handleInputChange}
        showCopyButton={field.properties?.showCopyButton}
        showPasswordToggle={
          field.properties?.showPasswordToggle || field.type === "password"
        }
        className={field.properties?.className}
        aria-invalid={error ? true : undefined}
        aria-describedby={settingRowDescribedBy(field.name, {
          help: Boolean(field.description),
          error: Boolean(error),
        })}
        {...restProperties}
        disabled={disabled}
        variant={error ? "invalid" : isDirty ? "dirty" : "default"}
      />
    </div>
  );
}
