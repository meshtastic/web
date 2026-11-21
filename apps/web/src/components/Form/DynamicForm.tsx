import { createZodResolver } from "@components/Form/createZodResolver.ts";
import {
  DynamicFormField,
  type FieldProps,
} from "@components/Form/DynamicFormField.tsx";
import { FieldWrapper } from "@components/Form/FormWrapper.tsx";
import { SettingsCard } from "@components/Settings/SettingsCard.tsx";
import { Button } from "@components/UI/Button.tsx";
import { type ReactNode, useEffect } from "react";
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
    /** Rows rendered before the fields, e.g. read-only key rows. */
    content?: ReactNode;
    /** Optional JSX rendered after the field list (e.g. action buttons that
     * reach into the form via useFormContext). */
    footer?: ReactNode;
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
        className="flex flex-col gap-5"
        {...(submitType === "onSubmit"
          ? { onSubmit: handleSubmit(onSubmit) }
          : { onChange: handleSubmit(onSubmit) })}
      >
        {fieldGroups.map((fieldGroup) => (
          <SettingsCard
            key={fieldGroup.label}
            title={fieldGroup.label}
            description={
              fieldGroup.notes ? (
                <>
                  {fieldGroup.description}
                  <span className="mt-1 block font-semibold text-secondary">
                    {fieldGroup.notes}
                  </span>
                </>
              ) : (
                fieldGroup.description
              )
            }
          >
            {fieldGroup.content}
            {fieldGroup.fields.map((field) => {
              const error = get(formState.errors, field.name);
              const fieldState = getFieldState(field.name);
              return (
                <FieldWrapper
                  key={field.label}
                  label={field.label}
                  fieldName={field.name}
                  description={field.description}
                  dirty={fieldState.isDirty}
                  stacked={field.type === "multiSelect"}
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
                    isDirty={fieldState.isDirty}
                    invalid={fieldState.invalid}
                  />
                </FieldWrapper>
              );
            })}
            {fieldGroup.footer ? (
              <div className="border-t border-subtle px-4 py-3.5">
                {fieldGroup.footer}
              </div>
            ) : null}
          </SettingsCard>
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
