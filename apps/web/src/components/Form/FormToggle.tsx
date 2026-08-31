import type {
  BaseFormBuilderProps,
  GenericFormElementProps,
} from "@components/Form/DynamicForm.tsx";
import { useFormAutoSave } from "@components/Form/formAutoSave.ts";
import { Switch } from "@components/UI/Switch.tsx";
import { cn } from "@core/utils/cn.ts";
import { Controller, type FieldValues } from "react-hook-form";

export interface ToggleFieldProps<T> extends BaseFormBuilderProps<T> {
  type: "toggle";
  inputChange?: (value: boolean) => void;
}

export function ToggleInput<T extends FieldValues>({
  control,
  disabled,
  field,
  isDirty,
  invalid,
}: GenericFormElementProps<T, ToggleFieldProps<T>>) {
  const autoSave = useFormAutoSave();

  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, onChange, ...rest } }) => (
        <Switch
          checked={value}
          id={field.name}
          disabled={disabled}
          {...field.properties}
          className={cn([
            field.properties?.className,
            isDirty
              ? "focus:ring-sky-500 ring-sky-500 ring-2 ring-offset-2"
              : "",
            invalid
              ? "focus:ring-red-500 ring-red-500 ring-2 ring-offset-2"
              : "",
          ])}
          {...rest}
          onCheckedChange={(v) => {
            onChange(v);
            field.inputChange?.(v);
            // A Radix Switch is a `<button role="switch">`, not a native form
            // control, so the enclosing `<form onChange={...}>` auto-save is
            // never guaranteed to run for it. Trigger it explicitly.
            autoSave?.();
          }}
          onClick={(event) => {
            // Radix mirrors the switch into a hidden `<input type="checkbox">`
            // and clicks it so the change bubbles to the enclosing form; it
            // skips that when the consumer stops propagation of the trigger
            // click. We save explicitly above, so opt out of the implicit
            // event to keep exactly one save per toggle.
            if (autoSave) {
              event.stopPropagation();
            }
          }}
        />
      )}
    />
  );
}
