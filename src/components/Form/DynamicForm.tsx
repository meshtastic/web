import {
  DynamicFormField,
  type FieldProps,
} from "@components/Form/DynamicFormField.tsx";
import { FieldWrapper } from "@components/Form/FormWrapper.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import {
  type Control,
  type DefaultValues,
  type FieldValues,
  FormProvider,
  get,
  type Path,
  type SubmitHandler,
  useForm,
} from "react-hook-form";
import { Heading } from "@components/UI/Typography/Heading.tsx";
import { ZodType } from "zod/v4";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { createZodResolver } from "@components/Form/createZodResolver.ts";
import { useAppStore } from "@core/stores/appStore.ts";
import { dotPaths } from "@core/utils/dotPath.ts";

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
}

export interface DynamicFormProps<T extends FieldValues> {
  onSubmit: SubmitHandler<T>;
  submitType?: "onChange" | "onSubmit";
  hasSubmitButton?: boolean;
  defaultValues?: DefaultValues<T>;
  fieldGroups: {
    label: string;
    description: string;
    notes?: string;
    valid?: boolean;
    validationText?: string;
    fields: FieldProps<T>[];
  }[];
  validationSchema?: ZodType<T>;
  formId?: string;
}

export function DynamicForm<T extends FieldValues>({
  onSubmit,
  submitType = "onChange",
  hasSubmitButton,
  defaultValues,
  fieldGroups,
  validationSchema,
  formId,
}: DynamicFormProps<T>) {
  const { t } = useTranslation();
  const {
    addError,
    removeError,
  } = useAppStore();

  const methods = useForm<
    T
  >({
    mode: "onChange",
    defaultValues: defaultValues,
    resolver: validationSchema
      ? createZodResolver(validationSchema)
      : undefined,
    shouldFocusError: false,
  });
  const { handleSubmit, control, getValues, formState } = methods;

  useEffect(() => {
    const errorKeys = Object.keys(formState.errors);
    if (formId) {
      if (
        errorKeys.length === 0
      ) {
        dotPaths(getValues()).forEach((key) => {
          removeError(key);
        });
        removeError(formId);
      } else {
        errorKeys.forEach((key) => {
          addError(key, "");
        });
        addError(formId, "");
      }
    }
  }, [formState.errors]);

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
                  valid={validationSchema // keep backwards compat with not updated cfg pages
                    ? !error
                    : field.validationText === undefined ||
                      field.validationText === ""}
                  validationText={validationSchema
                    ? (error
                      ? String(
                        t([`formValidation.${error.type}`, error.message], {
                          returnObjects: false,
                          ...error.params,
                        }),
                      )
                      : "")
                    : field.validationText}
                >
                  <DynamicFormField
                    field={field}
                    control={control}
                    disabled={isDisabled(field.disabledBy, field.disabled)}
                  />
                </FieldWrapper>
              );
            })}
          </div>
        ))}
        {hasSubmitButton && (
          <Button
            type="submit"
            variant="outline"
            disabled={!formState.isValid}
          >
            Submit
          </Button>
        )}
      </form>
    </FormProvider>
  );
}
