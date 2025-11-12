import type {
  BaseFormBuilderProps,
  GenericFormElementProps,
} from "@components/Form/DynamicForm.tsx";
import { Switch } from "@components/UI/Switch.tsx";
import { cn } from "@core/utils/cn.ts";
import { Controller, type FieldValues } from "react-hook-form";

export interface ToggleFieldProps<T> extends BaseFormBuilderProps<T> {
  type: "toggle";
  inputChange?: (value: boolean) => void;
  /**
   * Optional content to render below the toggle switch.
   * Use this for contextual UI that should appear when the toggle is enabled.
   * Example: Fixed Position picker that appears when Fixed Position is toggled on.
   */
  additionalContent?: React.ReactNode;
}

export function ToggleInput<T extends FieldValues>({
  control,
  disabled,
  field,
  isDirty,
  invalid,
}: GenericFormElementProps<T, ToggleFieldProps<T>>) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <Controller
        name={field.name}
        control={control}
        render={({ field: { value, onChange, ...rest } }) => (
          <Switch
            checked={value}
            onCheckedChange={(v) => {
              onChange(v);
              field.inputChange?.(v);
            }}
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
          />
        )}
      />
      {field.additionalContent}
    </div>
  );
}
