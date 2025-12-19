import { useMemo } from "react";

interface FieldGroup {
  label: string;
  description: string;
  notes?: string;
  valid?: boolean;
  validationText?: string;
  fields: Array<{
    label: string;
    description?: string;
    name: string;
  }>;
}

export const useConfigSearch = (
  fieldGroups: FieldGroup[],
  searchQuery: string,
) => {
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return fieldGroups;
    }

    const query = searchQuery.toLowerCase();

    return fieldGroups
      .map((group) => ({
        ...group,
        fields: group.fields.filter(
          (field) =>
            field.label.toLowerCase().includes(query) ||
            field.description?.toLowerCase().includes(query),
        ),
      }))
      .filter((group) => group.fields.length > 0);
  }, [fieldGroups, searchQuery]);

  return { filteredGroups };
};
