import { createZodResolver } from "@components/Form/createZodResolver.ts";
import {
  DynamicFormField,
  type FieldProps,
} from "@components/Form/DynamicFormField.tsx";
import { FieldWrapper } from "@components/Form/FormWrapper.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Heading } from "@components/UI/Typography/Heading.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import { useEffect } from "react";
import {
  type Control,
  type DefaultValues,
  type FieldValues,
  FormProvider,
  get,
  type Path,
  type SubmitHandler,
  type UseFormReturn,
  useForm,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { ZodType } from "zod/v4";

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

export interface GenericFormElementProps<T extends FieldValues, Y> {
  control: Control<T>;
  disabled?: boolean;
  field: Y;
  isDirty?: boolean;
  invalid?: boolean;
}

export interface DynamicFormProps<T extends FieldValues> {
  propMethods?: UseFormReturn<T, T, T>;
  onSubmit: SubmitHandler<T>;
  onFormInit?: DynamicFormFormInit<T>;
  submitType?: "onChange" | "onSubmit";
  hasSubmitButton?: boolean;
  defaultValues?: DefaultValues<T>;
  values?: T;
  fieldGroups: {
    label: string;
    description: string;
    notes?: string;
    valid?: boolean;
    validationText?: string;
    fields: FieldProps<T>[];
  }[];
  validationSchema?: ZodType<T>;
}

export type DynamicFormFormInit<T extends FieldValues> = (
  methods: UseFormReturn<T, T, T>,
) => void;

export function DynamicForm<T extends FieldValues>({
  propMethods,
  onSubmit,
  onFormInit,
  submitType = "onChange",
  hasSubmitButton,
  defaultValues,
  values,
  fieldGroups,
  validationSchema,
}: DynamicFormProps<T>) {
  const { t } = useTranslation();

  const internalMethods = useForm<T>({
    mode: "onChange",
    defaultValues: defaultValues,
    resolver: validationSchema
      ? createZodResolver(validationSchema)
      : undefined,
    shouldFocusError: false,
    resetOptions: { keepDefaultValues: true },
    values,
  });

  const methods = propMethods ?? internalMethods;

  const { handleSubmit, control, getValues, formState, getFieldState } =
    methods;

  useEffect(() => {
    if (!propMethods) {
      onFormInit?.(internalMethods);
    }
  }, [onFormInit, propMethods, internalMethods]);

  const isDisabled = (
    disabledBy?: DisabledBy<T>[],
    disabled?: boolean,
  ): boolean => {
    if (disabled) {
      return true;
    }
    if (!disabledBy) {
      return false;
    }

    return disabledBy.some((field) => {
      const value = getValues(field.fieldName);
      if (value === "always") {
        return true;
      }
      if (typeof value === "boolean") {
        return field.invert ? value : !value;
      }
      if (typeof value === "number") {
        return field.invert
          ? field.selector !== value
          : field.selector === value;
      }
      return false;
    });
  };

  return (
    <FormProvider {...methods}>
      <form
        className="space-y-8"
        {...(submitType === "onSubmit"
          ? { onSubmit: handleSubmit(onSubmit) }
          : { onChange: handleSubmit(onSubmit) })}
      >
        {fieldGroups.map((fieldGroup) => (
          <div key={fieldGroup.label} className="space-y-8 sm:space-y-5">
            <div>
              <Heading as="h4" className="font-medium">
                {fieldGroup.label}
              </Heading>
              <Subtle>{fieldGroup.description}</Subtle>
              <Subtle className="font-semibold">{fieldGroup?.notes}</Subtle>
            </div>

            {fieldGroup.fields.map((field) => {
              const error = get(formState.errors, field.name as string);
              return (
                <FieldWrapper
                  key={field.label}
                  label={field.label}
                  fieldName={field.name}
                  description={field.description}
                  valid={!error}
                  validationText={
                    error
                      ? String(
                          t([`formValidation.${error.type}`, error.message], {
                            returnObjects: false,
                            ...error.params,
                          }),
                        )
                      : ""
                  }
                >
                  <DynamicFormField
                    field={field}
                    control={control}
                    disabled={isDisabled(field.disabledBy, field.disabled)}
                    isDirty={getFieldState(field.name).isDirty}
                    invalid={getFieldState(field.name).invalid}
                  />
                </FieldWrapper>
              );
            })}
          </div>
        ))}
        {hasSubmitButton && (
          <Button type="submit" variant="outline" disabled={!formState.isValid}>
            {t("button.submit")}
          </Button>
        )}
      </form>
    </FormProvider>
  );
}
