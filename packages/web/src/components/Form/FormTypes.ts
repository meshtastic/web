import type { Control, FieldValues, Path } from "react-hook-form";

interface DisabledBy<T> {
  fieldName: Path<T>;
  selector?: number;
  invert?: boolean;
}

export interface BaseFormBuilderProps<T> {
  name: Path<T>;
  disabled?: boolean;
  disabledBy?: DisabledBy<T>[];
  label: string;
  description?: string;
  notes?: string;
  validationText?: string;
  properties?: Record<string, unknown>;
}

export interface GenericFormElementProps<
  T extends FieldValues,
  F = unknown,
> {
  control: Control<T>;
  disabled?: boolean;
  field: F;
  isDirty?: boolean;
  invalid?: boolean;
}
