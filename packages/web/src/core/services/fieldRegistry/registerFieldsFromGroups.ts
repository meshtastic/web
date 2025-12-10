import type {
  ConfigSection,
  FieldDefinition,
  FieldMetadata,
} from "./types";

interface FieldGroup {
  label: string;
  description: string;
  fields: FieldDefinition[];
}

/**
 * Helper to convert field groups into FieldMetadata for registration
 */
export function createFieldMetadata(
  section: ConfigSection,
  fieldGroups: FieldGroup[],
): FieldMetadata[] {
  const metadata: FieldMetadata[] = [];

  for (const group of fieldGroups) {
    for (const field of group.fields) {
      metadata.push({
        section,
        fieldName: field.name,
        label: field.label,
        description: field.description,
        fieldDefinition: field,
        groupLabel: group.label,
      });
    }
  }

  return metadata;
}
