import { createZodResolver } from "@components/Form/createZodResolver.ts";
import {
  DynamicFormField,
  type FieldProps,
} from "@components/Form/DynamicFormField.tsx";
import { FormAutoSaveContext } from "@components/Form/formAutoSave.ts";
import { FieldWrapper } from "@components/Form/FormWrapper.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Heading } from "@components/UI/Typography/Heading.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import { type ReactNode, useCallback, useEffect } from "react";
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

  // `handleSubmit` drops the save on the floor when *any* field fails
  // validation — including fields this form never renders (a stale schema
  // constraint, or a protobuf field the running bindings do not have). The
  // user sees the control move, no error appears next to anything they can
  // edit, and the value is never staged, so "Save" happily commits a
  // transaction without it. Make that failure mode visible instead of silent.
  const reportBlockedSave = useCallback((errors: unknown) => {
    console.warn(
      "[DynamicForm] change not saved: the form is invalid. Fields:",
      Object.keys((errors as Record<string, unknown>) ?? {}),
      errors,
    );
  }, []);

  // Same auto-save the `onChange` form handler runs, exposed imperatively for
  // fields that are not native DOM form controls and therefore never emit a
  // bubbling `change` event of their own (see formAutoSave.ts).
  const autoSave = useCallback(() => {
    void handleSubmit(onSubmit, reportBlockedSave)();
  }, [handleSubmit, onSubmit, reportBlockedSave]);

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
      <FormAutoSaveContext.Provider
        value={submitType === "onChange" ? autoSave : null}
      >
        <form
          className="space-y-8"
          {...(submitType === "onSubmit"
            ? { onSubmit: handleSubmit(onSubmit, reportBlockedSave) }
            : { onChange: handleSubmit(onSubmit, reportBlockedSave) })}
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
              {fieldGroup.footer}
            </div>
          ))}
          {hasSubmitButton && (
            <Button
              type="submit"
              variant="outline"
              disabled={!formState.isValid}
            >
              {t("button.submit")}
            </Button>
          )}
        </form>
      </FormAutoSaveContext.Provider>
    </FormProvider>
  );
}
