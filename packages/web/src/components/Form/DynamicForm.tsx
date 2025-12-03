import { createZodResolver } from "@components/Form/createZodResolver.ts";
import {
  DynamicFormField,
  type FieldProps,
} from "@components/Form/DynamicFormField.tsx";
import { Button } from "@components/ui/button.tsx";
import { Heading } from "@components/ui/typography/heading.tsx";
import { Subtle } from "@components/ui/typography/subtle.tsx";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@components/ui/form.tsx";
import { useEffect } from "react";
import {
  type DefaultValues,
  type FieldValues,
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

export interface GenericFormElementProps<Y> {
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
    mode: "onSubmit",
    defaultValues: defaultValues,
    resolver: validationSchema
      ? createZodResolver(validationSchema)
      : undefined,
    shouldFocusError: false,
    resetOptions: { keepDefaultValues: true },
    values,
  });

  const methods = propMethods ?? internalMethods;

  const { handleSubmit, getValues } = methods;

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
    <Form {...methods}>
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

            {fieldGroup.fields.map((field) => (
              <FormField
                key={field.name}
                control={methods.control}
                name={field.name}
                render={({ fieldState }) => (
                  <FormItem>
                    <FormLabel>{field.label}</FormLabel>
                    {field.description && (
                      <FormDescription>{field.description}</FormDescription>
                    )}
                    <FormControl>
                      <DynamicFormField
                        field={field as any}
                        control={methods.control}
                        disabled={isDisabled(field.disabledBy, field.disabled)}
                        isDirty={fieldState.isDirty}
                        invalid={fieldState.invalid}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        ))}
        {hasSubmitButton && (
          <Button
            type="submit"
            variant="outline"
            disabled={!methods.formState.isValid}
          >
            {t("button.submit")}
          </Button>
        )}
      </form>
    </Form>
  );
}
