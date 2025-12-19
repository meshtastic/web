# Settings Architecture

This document describes the form and state management architecture for the Settings pages.

## Overview

Each settings page manages its own form state via custom hooks, but all changes flow through a shared store. This allows editing multiple pages and saving all changes in one batch.

## Data Flow

```
User edits field
       │
       ▼
  Form watch()
       │
       ├──► trackChange() ──► fieldRegistry ──► Activity Panel
       │
       └──► setChange() ──► deviceStore ──► useSaveSettings ──► Device
```

## Two Tracking Systems

### 1. Field Registry (`useFieldRegistry`)

Tracks **per-field changes** for the Activity panel display.

```typescript
trackChange(section, fieldName, newValue, originalValue);
removeChange(section, fieldName);
```

- Powers the Activity panel sidebar
- Shows which specific fields have changed
- Allows individual field changes to be reverted

### 2. Device Store (`useDevice`)

Tracks **full config objects** for saving to the device.

```typescript
setChange({ type: "config", variant: "lora" }, newConfig, originalConfig);
```

- Collects all pending config changes
- `useSaveSettings` gathers all changes and sends to device
- Supports batch saving across multiple config types

## Hook Pattern

Each form hook follows this pattern:

```typescript
// In watch() subscription:
for (const key of Object.keys(currentValues)) {
  if (newValue !== originalValue) {
    // Track for Activity panel (per-field)
    trackChange(SECTION, key, newValue, originalValue);
    hasChanges = true;
  } else {
    // Remove from Activity if reverted to original
    removeChange(SECTION, key);
  }
}

if (hasChanges) {
  // Track for device save (full config)
  setChange(SECTION, { ...baseConfig, ...changes }, baseConfig);
}
```

## Available Hooks

### Device Config Pages

Use the generic `useConfigForm` hook from `@core/hooks/useConfigForm`:

- **LoRa** - `useConfigForm({ configType: "lora", schema: LoRaValidationSchema })`
- **Power** - `useConfigForm({ configType: "power", schema: PowerValidationSchema })`
- **Display** - `useConfigForm({ configType: "display", schema: DisplayValidationSchema })`
- **Bluetooth** - `useConfigForm({ configType: "bluetooth", schema: BluetoothValidationSchema })`

### Module Config Pages

Use the generic `useModuleConfigForm` hook from `@core/hooks/useModuleConfigForm`:

- **MQTT** - `useModuleConfigForm({ moduleConfigType: "mqtt", schema: MqttValidationSchema, transformDefaults: ... })`
- **Serial** - `useModuleConfigForm({ moduleConfigType: "serial", schema: SerialValidationSchema })`
- **External Notification** - `useModuleConfigForm({ moduleConfigType: "externalNotification", schema: ... })`
- **Store Forward** - `useModuleConfigForm({ moduleConfigType: "storeForward", schema: ... })`
- **Range Test** - `useModuleConfigForm({ moduleConfigType: "rangeTest", schema: ... })`
- **Telemetry** - `useModuleConfigForm({ moduleConfigType: "telemetry", schema: ... })`
- **Canned Message** - `useModuleConfigForm({ moduleConfigType: "cannedMessage", schema: ... })`
- **Audio** - `useModuleConfigForm({ moduleConfigType: "audio", schema: ... })`
- **Neighbor Info** - `useModuleConfigForm({ moduleConfigType: "neighborInfo", schema: ... })`
- **Ambient Lighting** - `useModuleConfigForm({ moduleConfigType: "ambientLighting", schema: ... })`
- **Detection Sensor** - `useModuleConfigForm({ moduleConfigType: "detectionSensor", schema: ... })`
- **Paxcounter** - `useModuleConfigForm({ moduleConfigType: "paxcounter", schema: ... })`

The `transformDefaults` option is useful for module configs with nested objects (e.g., MQTT's `mapReportSettings`).

### Complex Config Pages

Use specialized hooks from `@pages/Settings/hooks/`:

| Hook | Purpose |
|------|---------|
| `useSecurityForm` | Handles base64 encoding/decoding for keys, key regeneration |
| `usePositionForm` | Manages position flags bitmask, fixed position admin messages |
| `useUserForm` | Gets data from nodes table, uses `connection.setOwner()` |
| `useDeviceForm` | Integrates unsafe role validation dialog |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Settings Page                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   LoRa      │  │  Security   │  │  Position   │   ...    │
│  │  (simple)   │  │ (complex)   │  │ (complex)   │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                  │
│  useConfigForm    useSecurityForm  usePositionForm          │
│         │                │                │                  │
│         └────────────────┴────────────────┘                  │
│                          │                                   │
│              ┌───────────┴───────────┐                      │
│              │                       │                       │
│              ▼                       ▼                       │
│      trackChange()            setChange()                   │
│              │                       │                       │
│              ▼                       ▼                       │
│      ┌──────────────┐       ┌──────────────┐               │
│      │fieldRegistry │       │ deviceStore  │               │
│      └──────┬───────┘       └──────┬───────┘               │
│             │                      │                        │
│             ▼                      ▼                        │
│      Activity Panel         useSaveSettings                 │
│                                    │                        │
│                                    ▼                        │
│                              Save to Device                 │
└─────────────────────────────────────────────────────────────┘
```

## ConfigFormFields Component

The `ConfigFormFields` component (`@components/Form/ConfigFormFields`) renders field groups declaratively:

```typescript
const fieldGroups: FieldGroup<MyValidation>[] = [
  {
    label: "Section Title",
    description: "Section description",
    fields: [
      { type: "text", name: "fieldName", label: "Field Label" },
      { type: "toggle", name: "enabled", label: "Enabled" },
      { type: "select", name: "mode", label: "Mode", properties: { enumValue: MyEnum } },
      { type: "custom", name: "custom", label: "Custom", customComponent: MyComponent },
    ],
  },
];

return (
  <ConfigFormFields
    form={form}
    fieldGroups={fieldGroups}
    isDisabledByField={isDisabledByField}
  />
);
```

### Supported Field Types

- `text` - Text input
- `number` - Number input
- `password` - Password input
- `toggle` - Boolean toggle/switch
- `select` - Dropdown select (supports enums)
- `multiSelect` - Multi-select dropdown
- `custom` - Custom component via `customComponent` prop

## Adding a New Settings Page

1. Create a Zod validation schema in `@app/validation/config/`
2. Choose the appropriate hook:
   - Simple config: Use `useConfigForm`
   - Complex logic: Create a custom hook in `@pages/Settings/hooks/`
3. Define field groups with `FieldGroup<YourValidation>[]`
4. Handle loading state with `isReady`
5. Render with `<ConfigFormFields />`

Example:

```typescript
import { useConfigForm } from "@core/hooks/useConfigForm";
import { ConfigFormFields, type FieldGroup } from "@components/Form/ConfigFormFields";
import { ConfigFormSkeleton } from "@pages/Settings/SettingsLoading";
import { MyValidationSchema, type MyValidation } from "@app/validation/config/my";

export const MySettings = () => {
  const { form, isReady, isDisabledByField } = useConfigForm<MyValidation>({
    configType: "my",
    schema: MyValidationSchema,
  });

  // Show loading skeleton until config is fetched from device
  if (!isReady) {
    return <ConfigFormSkeleton />;
  }

  const fieldGroups: FieldGroup<MyValidation>[] = [
    // ... define fields
  ];

  return (
    <ConfigFormFields
      form={form}
      fieldGroups={fieldGroups}
      isDisabledByField={isDisabledByField}
    />
  );
};
```
