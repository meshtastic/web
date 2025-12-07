import type { FieldProps } from "@components/Form/DynamicFormField";
import type { ConfigSection, FieldMetadata } from "./types.ts";

interface FieldGroup<T> {
  label: string;
  description: string;
  fields: FieldProps<T>[];
}

/**
 * Helper to convert DynamicForm field groups into FieldMetadata for registration
 */
export function createFieldMetadata<T>(
  section: ConfigSection,
  fieldGroups: FieldGroup<T>[],
): FieldMetadata[] {
  const metadata: FieldMetadata[] = [];

  for (const group of fieldGroups) {
    for (const field of group.fields) {
      metadata.push({
        section,
        fieldName: field.name as string,
        label: field.label,
        description: field.description,
        fieldDefinition: field as FieldProps<unknown>,
        groupLabel: group.label,
      });
    }
  }

  return metadata;
}
