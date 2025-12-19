import { useSyncExternalStore } from "react";
import { fieldRegistry } from "./FieldRegistry.ts";
import type {
  ConfigSection,
  FieldChangeEntry,
  FieldMetadata,
  FieldSearchResult,
} from "./types.ts";

/**
 * A wrapper store that adds reactivity to the static fieldRegistry.
 * This avoids global monkey-patching and isolates the subscription logic.
 */
class FieldRegistryStore {
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  // Snapshot for useSyncExternalStore
  getSnapshot = () => {
    return fieldRegistry.getChangeCount();
  };

  // Reactive mutators
  trackChange = (
    section: ConfigSection,
    fieldName: string,
    newValue: unknown,
    originalValue?: unknown,
  ) => {
    fieldRegistry.trackChange(section, fieldName, newValue, originalValue);
    this.notify();
  };

  removeChange = (section: ConfigSection, fieldName: string) => {
    fieldRegistry.removeChange(section, fieldName);
    this.notify();
  };

  clearAllChanges = () => {
    fieldRegistry.clearAllChanges();
    this.notify();
  };

  // Pass-through read methods
  registerFields = (section: ConfigSection, fields: FieldMetadata[]) => {
    return fieldRegistry.registerFields(section, fields);
  };

  getFieldsForSection = (section: ConfigSection) => {
    return fieldRegistry.getFieldsForSection(section);
  };

  getField = (section: ConfigSection, fieldName: string) => {
    return fieldRegistry.getField(section, fieldName);
  };

  getAllFields = () => {
    return fieldRegistry.getAllFields();
  };

  searchFields = (query: string): FieldSearchResult[] => {
    return fieldRegistry.searchFields(query);
  };

  getAllChanges = (): FieldChangeEntry[] => {
    return fieldRegistry.getAllChanges();
  };

  getChangesForSection = (section: ConfigSection): FieldChangeEntry[] => {
    return fieldRegistry.getChangesForSection(section);
  };

  hasChange = (section: ConfigSection, fieldName: string) => {
    return fieldRegistry.hasChange(section, fieldName);
  };

  getChange = (section: ConfigSection, fieldName: string) => {
    return fieldRegistry.getChange(section, fieldName);
  };

  getChangeCount = () => {
    return fieldRegistry.getChangeCount();
  };
}

// Singleton instance of the store
export const registryStore = new FieldRegistryStore();

export function useFieldRegistry() {
  const changeCount = useSyncExternalStore(
    registryStore.subscribe,
    registryStore.getSnapshot,
    registryStore.getSnapshot,
  );

  return {
    // State
    changeCount,

    // Actions
    trackChange: registryStore.trackChange,
    removeChange: registryStore.removeChange,
    clearAllChanges: registryStore.clearAllChanges,

    // Queries (Pass-throughs)
    registerFields: registryStore.registerFields,
    getFieldsForSection: registryStore.getFieldsForSection,
    getField: registryStore.getField,
    getAllFields: registryStore.getAllFields,
    searchFields: registryStore.searchFields,
    getAllChanges: registryStore.getAllChanges,
    getChangesForSection: registryStore.getChangesForSection,
    hasChange: registryStore.hasChange,
    getChange: registryStore.getChange,
    getChangeCount: registryStore.getChangeCount,
  };
}
