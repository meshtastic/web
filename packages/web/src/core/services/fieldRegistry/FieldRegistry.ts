import type {
  ConfigSection,
  FieldChangeEntry,
  FieldMetadata,
  FieldSearchResult,
} from "./types.ts";

// Serialize section to string for Map keys
function serializeSection(section: ConfigSection): string {
  if (section.type === "channel") {
    return "channel";
  }
  return `${section.type}:${section.variant}`;
}

// Serialize field to string for Map keys
function serializeField(section: ConfigSection, fieldName: string): string {
  return `${serializeSection(section)}:${fieldName}`;
}

export class FieldRegistry {
  // Map of section -> fields
  private fields = new Map<string, Map<string, FieldMetadata>>();

  // Map of field changes (fieldKey -> changeEntry)
  private changes = new Map<string, FieldChangeEntry>();

  /**
   * Register fields for a config section
   */
  registerFields(section: ConfigSection, fields: FieldMetadata[]): void {
    const sectionKey = serializeSection(section);
    const fieldMap = this.fields.get(sectionKey) || new Map();

    for (const field of fields) {
      fieldMap.set(field.fieldName, field);
    }

    this.fields.set(sectionKey, fieldMap);
  }

  /**
   * Get all fields for a section
   */
  getFieldsForSection(section: ConfigSection): FieldMetadata[] {
    const sectionKey = serializeSection(section);
    const fieldMap = this.fields.get(sectionKey);
    return fieldMap ? Array.from(fieldMap.values()) : [];
  }

  /**
   * Get a specific field's metadata
   */
  getField(
    section: ConfigSection,
    fieldName: string,
  ): FieldMetadata | undefined {
    const sectionKey = serializeSection(section);
    return this.fields.get(sectionKey)?.get(fieldName);
  }

  /**
   * Get all registered fields across all sections
   */
  getAllFields(): FieldMetadata[] {
    const allFields: FieldMetadata[] = [];
    for (const fieldMap of this.fields.values()) {
      allFields.push(...fieldMap.values());
    }
    return allFields;
  }

  /**
   * Search fields by query (label, description, group)
   */
  searchFields(query: string): FieldSearchResult[] {
    if (!query.trim()) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    const results: FieldSearchResult[] = [];

    for (const field of this.getAllFields()) {
      let matchType: "label" | "description" | "group" | null = null;
      let relevanceScore = 0;

      // Check label
      if (field.label.toLowerCase().includes(lowerQuery)) {
        matchType = "label";
        relevanceScore = field.label.toLowerCase().startsWith(lowerQuery)
          ? 3
          : 2;
      }
      // Check description
      else if (field.description?.toLowerCase().includes(lowerQuery)) {
        matchType = "description";
        relevanceScore = 1;
      }
      // Check group label
      else if (field.groupLabel?.toLowerCase().includes(lowerQuery)) {
        matchType = "group";
        relevanceScore = 1;
      }

      if (matchType) {
        results.push({ field, matchType, relevanceScore });
      }
    }

    // Sort by relevance
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Track a field change
   */
  trackChange(
    section: ConfigSection,
    fieldName: string,
    newValue: unknown,
    originalValue?: unknown,
  ): void {
    const fieldKey = serializeField(section, fieldName);
    this.changes.set(fieldKey, {
      section,
      fieldName,
      newValue,
      originalValue,
      timestamp: Date.now(),
    });
  }

  /**
   * Remove a tracked change
   */
  removeChange(section: ConfigSection, fieldName: string): void {
    const fieldKey = serializeField(section, fieldName);
    this.changes.delete(fieldKey);
  }

  /**
   * Get all tracked changes
   */
  getAllChanges(): FieldChangeEntry[] {
    return Array.from(this.changes.values()).sort(
      (a, b) => b.timestamp - a.timestamp,
    );
  }

  /**
   * Get changes for a specific section
   */
  getChangesForSection(section: ConfigSection): FieldChangeEntry[] {
    const sectionKey = serializeSection(section);
    return this.getAllChanges().filter(
      (change) => serializeSection(change.section) === sectionKey,
    );
  }

  /**
   * Get total change count
   */
  getChangeCount(): number {
    return this.changes.size;
  }

  /**
   * Check if a field has pending changes
   */
  hasChange(section: ConfigSection, fieldName: string): boolean {
    const fieldKey = serializeField(section, fieldName);
    return this.changes.has(fieldKey);
  }

  /**
   * Get a specific field's change entry
   */
  getChange(
    section: ConfigSection,
    fieldName: string,
  ): FieldChangeEntry | undefined {
    const fieldKey = serializeField(section, fieldName);
    return this.changes.get(fieldKey);
  }

  /**
   * Clear all changes
   */
  clearAllChanges(): void {
    this.changes.clear();
  }

  /**
   * Clear all registered fields (useful for testing)
   */
  clearAllFields(): void {
    this.fields.clear();
  }
}

// Singleton instance
export const fieldRegistry = new FieldRegistry();
