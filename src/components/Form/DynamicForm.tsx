import {
  Control,
  DeepPartial,
  FieldValues,
  Path,
  SubmitHandler,
  useForm
} from "react-hook-form";
import { H4 } from "@components/UI/Typography/H4.js";
import { Subtle } from "@components/UI/Typography/Subtle.js";
import { DynamicFormField, FieldProps } from "./DynamicFormField.js";
import { FieldWrapper } from "./FormWrapper.js";
import { Button } from "../UI/Button.js";
import { useState } from "react";

export interface EnableSwitchData {
  getEnabled: (name: string) => boolean;
  setEnabled: (name: string, value: boolean) => void;
}

interface DisabledBy<T> {
  fieldName: Path<T>;
  selector?: number;
  invert?: boolean;
}

export interface BaseFormBuilderProps<T> {
  name: Path<T>;
  disabledBy?: DisabledBy<T>[];
  label: string;
  description?: string;
  properties?: {};
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
  defaultValues?: DeepPartial<T>;
  enableSwitch?: EnableSwitchData;
  fieldGroups: {
    label: string;
    description: string;
    fields: FieldProps<T>[];
  }[];
}

export function DynamicForm<T extends FieldValues>({
  onSubmit,
  submitType = "onChange",
  hasSubmitButton,
  defaultValues,
  enableSwitch,
  fieldGroups
}: DynamicFormProps<T>) {
  const { handleSubmit, control, getValues } = useForm<T>({
    mode: submitType,
    defaultValues: defaultValues
  });

  const isDisabled = (disabledBy?: DisabledBy<T>[]): boolean => {
    if (!disabledBy) return false;

    return disabledBy.some((field) => {
      const value = getValues(field.fieldName);
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
            onChange: handleSubmit(onSubmit)
          })}
    >
      {fieldGroups.map((fieldGroup, index) => (
        <div
          key={index}
          className="space-y-8 divide-y divide-gray-200 sm:space-y-5"
        >
          <div>
            <H4 className="font-medium">{fieldGroup.label}</H4>
            <Subtle>{fieldGroup.description}</Subtle>
          </div>

          {fieldGroup.fields.map((field, index) => {
            const fullFieldName = `${fieldGroup.label}_${field.name}`;
            const [enableSwitchState, setEnableSwitchState] = useState(
              enableSwitch?.getEnabled(fullFieldName)
            );
            return (
              <FieldWrapper
                label={field.label}
                description={field.description}
                enableSwitchEnabled={enableSwitchState}
                onEnableSwitchChanged={(value) => {
                  enableSwitch?.setEnabled(fullFieldName, value);
                  setEnableSwitchState(value);
                }}
              >
                <DynamicFormField
                  key={index}
                  field={field}
                  control={control}
                  disabled={
                    isDisabled(field.disabledBy) || enableSwitchState == false
                  }
                />
              </FieldWrapper>
            );
          })}
        </div>
      ))}
      {hasSubmitButton && <Button type="submit">Submit</Button>}
    </form>
  );
}
