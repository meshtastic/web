# Field Registry System

A centralized service for managing field metadata, change tracking, and search across all configuration settings.

## Overview

The Field Registry replaces the previous change registry system with a more powerful, field-level tracking approach that provides:

- **Field-Level Tracking**: Track changes to individual fields (e.g., "Region") instead of entire config objects
- **Searchability**: Search across all settings fields by label or description
- **Type Safety**: ConfigSection uses discriminated unions for compile-time safety
- **Reactivity**: Automatic UI updates via useSyncExternalStore
- **Simplicity**: Single service instead of deviceStore integration

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Field Registry                          │
│  - Field Metadata (labels, descriptions, sections)         │
│  - Change Tracking (individual field changes)              │
│  - Search (by label/description/group)                     │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼─────┐    ┌────────▼────────┐   ┌─────▼──────┐
│  LoRa.tsx   │    │ Position.tsx    │   │  MQTT.tsx  │
│  (migrated) │    │ (needs migrate) │   │  (future)  │
└─────────────┘    └─────────────────┘   └────────────┘
```

## File Structure

```
src/core/services/fieldRegistry/
├── FieldRegistry.ts              # Core registry class
├── types.ts                      # TypeScript types
├── useFieldRegistry.ts           # React hook
├── registerFieldsFromGroups.ts   # Helper to convert DynamicForm configs
├── index.ts                      # Barrel export
├── README.md                     # This file
├── MIGRATION_EXAMPLE.md          # Example usage
└── COMPONENT_MIGRATION_GUIDE.md  # Step-by-step migration guide
```

## Quick Start

### 1. Register Fields (Component Mount)

```typescript
import { useFieldRegistry, createFieldMetadata } from "@core/services/fieldRegistry";
import { useEffect } from "react";

export const LoRa = ({ onFormInit }) => {
  const { registerFields } = useFieldRegistry();
  const section = { type: "config", variant: "lora" } as const;

  const fieldGroups = [
    {
      label: "LoRa Settings",
      description: "Configure LoRa radio parameters",
      fields: [
        {
          type: "select",
          name: "region",
          label: "Region",
          description: "LoRa frequency region",
          properties: { enumValue: RegionCodes },
        },
        // ... more fields
      ],
    },
  ];

  // Register on mount
  useEffect(() => {
    const metadata = createFieldMetadata(section, fieldGroups);
    registerFields(section, metadata);
  }, [registerFields]);

  // ...
};
```

### 2. Track Changes (Form Submit)

```typescript
const { trackChange, removeChange: removeFieldChange } = useFieldRegistry();

const onSubmit = (data: LoRaValidation) => {
  const originalData = config.lora;

  (Object.keys(data) as Array<keyof LoRaValidation>).forEach((fieldName) => {
    const newValue = data[fieldName];
    const oldValue = originalData[fieldName];

    if (newValue !== oldValue) {
      trackChange(section, fieldName as string, newValue, oldValue);
    } else {
      removeFieldChange(section, fieldName as string);
    }
  });
};
```

### 3. Display Activity

```typescript
const { getAllChanges, getField } = useFieldRegistry();

const ActivityPanel = () => {
  const changes = getAllChanges();

  return (
    <div>
      {changes.map((change) => {
        const field = getField(change.section, change.fieldName);
        return (
          <div key={change.fieldName}>
            <strong>{field?.label}</strong> {/* Shows "Region" not "LoRa" */}
            <p>Section: {change.section.variant}</p>
            <p>{formatRelativeTime(change.timestamp)}</p>
          </div>
        );
      })}
    </div>
  );
};
```

### 4. Search Fields

```typescript
const { searchFields } = useFieldRegistry();

const results = searchFields("region"); // Returns all fields matching "region"
```

## API Reference

### `useFieldRegistry()`

Returns an object with:

**Field Registration:**
- `registerFields(section, fields)` - Register fields for a section
- `getFieldsForSection(section)` - Get all fields for a section
- `getField(section, fieldName)` - Get a specific field's metadata
- `getAllFields()` - Get all registered fields

**Change Tracking:**
- `trackChange(section, fieldName, newValue, originalValue?)` - Track a field change
- `removeChange(section, fieldName)` - Remove a tracked change
- `getAllChanges()` - Get all tracked changes (sorted by timestamp)
- `getChangesForSection(section)` - Get changes for a specific section
- `getChangeCount()` - Get total number of changes (reactive!)
- `hasChange(section, fieldName)` - Check if a field has changes
- `clearAllChanges()` - Clear all tracked changes

**Search:**
- `searchFields(query)` - Search fields by label/description/group

### `ConfigSection` Type

Discriminated union of all config sections:

```typescript
type ConfigSection =
  | { type: "config"; variant: "lora" }
  | { type: "config"; variant: "security" }
  | { type: "config"; variant: "position" }
  // ... all config types
  | { type: "moduleConfig"; variant: "mqtt" }
  | { type: "moduleConfig"; variant: "serial" }
  // ... all module config types
  | { type: "channel"; variant: "channel" };
```

## Migration Status

### ✅ Completed
- Core field registry service
- React hook with reactivity
- LoRa.tsx component
- Activity panel
- Settings page change count

### ⏳ In Progress
- Remaining config components (11 files)

### 📋 Planned
- Search implementation
- Remove old change registry from deviceStore
- Enhanced activity features (show old/new values, grouping, etc.)

## Benefits Over Old System

| Feature | Old Change Registry | New Field Registry |
|---------|-------------------|-------------------|
| Granularity | Config-level (entire LoRa config) | Field-level (individual "Region") |
| Search | Not supported | Full-text search across all fields |
| Type Safety | String keys | Discriminated unions |
| Location | Buried in deviceStore | Standalone service |
| Reactivity | Zustand subscription | useSyncExternalStore |
| Activity Display | "LoRa Config" | "Region" (actual field) |

## Examples

See:
- `MIGRATION_EXAMPLE.md` - Detailed examples
- `COMPONENT_MIGRATION_GUIDE.md` - Step-by-step migration
- `src/components/PageComponents/Settings/LoRa.tsx` - Real implementation
