import type {
    BaseFormBuilderProps,
    GenericFormElementProps,
  } from "@components/Form/DynamicForm.js";
  import { Generator } from "@components/UI/Generator.js";
  import { useState } from "react";
  import { Controller, type FieldValues } from "react-hook-form";
  
  export interface PasswordGeneratorProps<T> extends BaseFormBuilderProps<T> {
    type: "passwordGenerator";
  }
  
  export function PasswordGenerator<T extends FieldValues>({
    control,
    field,
  }: GenericFormElementProps<T, PasswordGeneratorProps<T>>) {
    return (
      <Controller
        name={field.name}
        control={control}
        render={({ field: { value, onChange, ...rest } }) => (
          <Generator
            variant={"success"}
            textValue="Generate"
            {...field.properties}
            {...rest}
          />
        )}
      />
    );
  }
  