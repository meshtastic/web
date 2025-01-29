import {
  DynamicFormField,
  type FieldProps,
} from "@components/Form/DynamicFormField.tsx";
import { FieldWrapper } from "@components/Form/FormWrapper.tsx";
import { Button } from "@components/UI/Button.tsx";
import { H4 } from "@components/UI/Typography/H4.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import {
  type Control,
  type DefaultValues,
  type FieldValues,
  type Path,
  type SubmitHandler,
  useForm,
} from "react-hook-form";

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
  validationText?: string;
  properties?: Record<string, unknown>;
}

export interface GenericFormElementProps<T extends FieldValues, Y> {
  control: Control<T>;
  disabled?: boolean;
  field: Y;
}

export interface DynamicFormProps<T extends FieldValues> {
  onSubmit: SubmitHandler<T>;
  submitType?: "onChange" | "onSubmit";
  hasSubmitButton?: boolean;
  defaultValues?: DefaultValues<T>;
  fieldGroups: {
    label: string;
    description: string;
    valid?: boolean;
    validationText?: string;
    fields: FieldProps<T>[];
  }[];
}

export function DynamicForm<T extends FieldValues>({
  onSubmit,
  submitType = "onChange",
  hasSubmitButton,
  defaultValues,
  fieldGroups,
}: DynamicFormProps<T>) {
  const { handleSubmit, control, getValues } = useForm<T>({
    mode: submitType,
    defaultValues: defaultValues,
  });

  const isDisabled = (
    disabledBy?: DisabledBy<T>[],
    disabled?: boolean,
  ): boolean => {
    if (disabled) return true;
    if (!disabledBy) return false;

    return disabledBy.some((field) => {
      const value = getValues(field.fieldName);
      if (value === "always") return true;
      if (typeof value === "boolean") return field.invert ? value : !value;
      if (typeof value === "number")
        return field.invert
          ? field.selector !== value
          : field.selector === value;
      return false;
    });
  };

  return (
    <form
      className="space-y-8 divide-y divide-gray-200"
      {...(submitType === "onSubmit"
        ? { onSubmit: handleSubmit(onSubmit) }
        : {
            onChange: handleSubmit(onSubmit),
          })}
    >
      {fieldGroups.map((fieldGroup) => (
        <div
          key={fieldGroup.label}
          className="space-y-8 divide-y divide-gray-200 sm:space-y-5"
        >
          <div>
            <H4 className="font-medium">{fieldGroup.label}</H4>
            <Subtle>{fieldGroup.description}</Subtle>
          </div>

          {fieldGroup.fields.map((field) => (
            <FieldWrapper
              key={field.label}
              label={field.label}
              description={field.description}
              valid={
                field.validationText === undefined ||
                field.validationText === ""
              }
              validationText={field.validationText}
            >
              <DynamicFormField
                field={field}
                control={control}
                disabled={isDisabled(field.disabledBy, field.disabled)}
              />
            </FieldWrapper>
          ))}
        </div>
      ))}
      {hasSubmitButton && <Button type="submit">Submit</Button>}
    </form>
  );
}
