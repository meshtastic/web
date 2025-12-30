import { GenericInput } from "./FormInput";
import {
  type MultiSelectFieldProps,
  MultiSelectInput,
} from "./FormMultiSelect";
import { PasswordGenerator } from "./FormPasswordGenerator";
import { SelectInput } from "./FormSelect";
import { ToggleInput } from "./FormToggle";
import type { ButtonVariant } from "@shared/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@shared/components/ui/form";
import { Heading } from "@shared/components/ui/typography/heading";
import { Subtle } from "@shared/components/ui/typography/subtle";
import type { ChangeEventHandler, ComponentType, ReactNode } from "react";
import type {
  Control,
  ControllerFieldState,
  FieldValues,
  Path,
  UseFormReturn,
} from "react-hook-form";

// Field type definitions
export type FieldType =
  | "text"
  | "number"
  | "password"
  | "toggle"
  | "select"
  | "multiSelect"
  | "passwordGenerator"
  | "custom";

export interface DisabledByConfig<T extends FieldValues> {
  fieldName: Path<T>;
  selector?: number;
  invert?: boolean;
}

// Props passed to custom components
export interface CustomFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  disabled: boolean;
  fieldState: ControllerFieldState;
}

export interface FieldConfig<T extends FieldValues> {
  type: FieldType;
  name: Path<T>;
  label: string;
  description?: string;
  disabled?: boolean;
  disabledBy?: DisabledByConfig<T>[];
  properties?: {
    enumValue?: Record<string, string | number>;
    formatEnumName?: boolean;
    suffix?: string;
    step?: number;
    className?: string;
    showCopyButton?: boolean;
    showPasswordToggle?: boolean;
    fieldLength?: {
      min?: number;
      max?: number;
      showCharacterCount?: boolean;
    };
    // For multiSelect type
    value?: string[];
    isChecked?: (name: string) => boolean;
    onValueChange?: (name: string) => void;
    placeholder?: string;
  };
  inputChange?:
    | ChangeEventHandler<HTMLInputElement>
    | ((value: boolean) => void);
  // For multiSelect type
  options?: Array<{ label: string; value: string }>;
  // For custom type - render any component with form control access
  customComponent?: ComponentType<CustomFieldProps<T>>;
  // For passwordGenerator type
  passwordGenerator?: {
    id: string;
    hide?: boolean;
    bits?: { text: string; value: string; key: string }[];
    devicePSKBitCount: number;
    selectChange?: (event: string) => void;
    actionButtons: {
      text: string;
      onClick: React.MouseEventHandler<HTMLButtonElement>;
      variant: ButtonVariant;
      className?: string;
    }[];
  };
}

export interface FieldGroup<T extends FieldValues> {
  label: string;
  description: string;
  notes?: string;
  fields: FieldConfig<T>[];
}

interface ConfigFormFieldsProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  fieldGroups: FieldGroup<T>[];
  isDisabledByField: (
    disabledBy?: DisabledByConfig<T>[],
    disabled?: boolean,
  ) => boolean;
  disabled?: boolean; // Globally disable all fields (e.g., unauthorized remote admin)
}

interface SingleFieldProps<T extends FieldValues> {
  field: FieldConfig<T>;
  control: Control<T>;
  disabled: boolean;
}

function renderFieldInput<T extends FieldValues>(
  field: FieldConfig<T>,
  control: Control<T>,
  disabled: boolean,
  fieldState: ControllerFieldState,
): ReactNode {
  switch (field.type) {
    case "select":
      return (
        <SelectInput
          field={{
            type: "select",
            name: field.name,
            label: field.label,
            properties: field.properties as {
              enumValue: Record<string, string | number>;
              formatEnumName?: boolean;
            },
          }}
          control={control}
          disabled={disabled}
          isDirty={fieldState.isDirty}
          invalid={fieldState.invalid}
        />
      );

    case "toggle":
      return (
        <ToggleInput
          field={{
            type: "toggle",
            name: field.name,
            label: field.label,
            inputChange: field.inputChange as
              | ((value: boolean) => void)
              | undefined,
            properties: field.properties,
          }}
          control={control}
          disabled={disabled}
          isDirty={fieldState.isDirty}
          invalid={fieldState.invalid}
        />
      );

    case "multiSelect": {
      const props = field.properties;
      return (
        <MultiSelectInput
          field={{
            type: "multiSelect",
            name: field.name,
            label: field.label,
            value: props?.value ?? [],
            isChecked: props?.isChecked ?? (() => false),
            onValueChange: props?.onValueChange ?? (() => {}),
            properties: props as MultiSelectFieldProps<T>["properties"],
          }}
          control={control}
          disabled={disabled}
          isDirty={fieldState.isDirty}
          invalid={fieldState.invalid}
        />
      );
    }

    case "passwordGenerator": {
      const pg = field.passwordGenerator;
      if (!pg) {
        return null;
      }
      return (
        <PasswordGenerator
          field={{
            type: "passwordGenerator",
            name: field.name,
            label: field.label,
            id: pg.id,
            hide: pg.hide,
            bits: pg.bits,
            devicePSKBitCount: pg.devicePSKBitCount,
            inputChange:
              field.inputChange as React.ChangeEventHandler<HTMLInputElement>,
            selectChange: pg.selectChange,
            actionButtons: pg.actionButtons,
            properties: field.properties,
          }}
          control={control}
          disabled={disabled}
          isDirty={fieldState.isDirty}
          invalid={fieldState.invalid}
        />
      );
    }

    case "custom": {
      const CustomComponent = field.customComponent;
      if (!CustomComponent) {
        return null;
      }
      return (
        <CustomComponent
          control={control}
          name={field.name}
          disabled={disabled}
          fieldState={fieldState}
        />
      );
    }
    default:
      return (
        <GenericInput
          field={{
            type: field.type as "text" | "number" | "password",
            name: field.name,
            label: field.label,
            inputChange: field.inputChange as
              | ChangeEventHandler<HTMLInputElement>
              | undefined,
            properties: field.properties as {
              suffix?: string;
              step?: number;
              className?: string;
              showCopyButton?: boolean;
              showPasswordToggle?: boolean;
              fieldLength?: {
                min?: number;
                max?: number;
                showCharacterCount?: boolean;
              };
            },
          }}
          control={control}
          disabled={disabled}
          isDirty={fieldState.isDirty}
        />
      );
  }
}

function ConfigFormField<T extends FieldValues>({
  field,
  control,
  disabled,
}: SingleFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={field.name}
      render={({ fieldState }) => (
        <FormItem>
          <FormLabel>{field.label}</FormLabel>
          {field.description && (
            <FormDescription>{field.description}</FormDescription>
          )}
          <FormControl>
            {renderFieldInput(field, control, disabled, fieldState)}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function ConfigFormFields<T extends FieldValues>({
  form,
  fieldGroups,
  isDisabledByField,
  disabled = false,
}: ConfigFormFieldsProps<T>) {
  return (
    <Form {...form}>
      <form className="space-y-8">
        {fieldGroups.map((group) => (
          <div key={group.label} className="space-y-8 sm:space-y-5">
            <div>
              <Heading as="h4" className="font-medium">
                {group.label}
              </Heading>
              <Subtle>{group.description}</Subtle>
              {group.notes && (
                <Subtle className="font-semibold">{group.notes}</Subtle>
              )}
            </div>
            {group.fields.map((field) => (
              <ConfigFormField
                key={field.name}
                field={field}
                control={form.control}
                disabled={
                  disabled || isDisabledByField(field.disabledBy, field.disabled)
                }
              />
            ))}
          </div>
        ))}
      </form>
    </Form>
  );
}
