# Field Registry Component Migration Guide

## Components That Need Migration

✅ **Done - All Components Migrated!**
- LoRa.tsx
- Position.tsx
- Bluetooth.tsx
- Power.tsx
- Display.tsx
- Network/index.tsx
- Device/index.tsx
- Security/Security.tsx (complex - has key generation)
- Security/SecurityConfig.tsx (custom UI)
- LoRa/LoRaConfig.tsx (custom UI)
- Channels/ChannelsConfig.tsx (custom UI, tracks by channel index)

⏭️ **Skipped (doesn't use setChange/removeChange):**
- User.tsx (uses connection.setOwner() directly)

## Migration Pattern

### Before (Old Pattern):
```typescript
import { useDevice } from "@core/stores";
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";

export const Position = ({ onFormInit }: PositionConfigProps) => {
  const { setChange, config, getEffectiveConfig, removeChange } = useDevice();
  const { t } = useTranslation("config");

  const onSubmit = (data: PositionValidation) => {
    if (deepCompareConfig(config.position, data, true)) {
      removeChange({ type: "config", variant: "position" });
      return;
    }
    setChange({ type: "config", variant: "position" }, data, config.position);
  };

  return (
    <DynamicForm<PositionValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={PositionValidationSchema}
      defaultValues={config.position}
      values={getEffectiveConfig("position")}
      fieldGroups={[
        // ... field definitions
      ]}
    />
  );
};
```

### After (New Pattern):
```typescript
import { useDevice } from "@core/stores";
import { createFieldMetadata, useFieldRegistry } from "@core/services/fieldRegistry";
import { useEffect } from "react";

export const Position = ({ onFormInit }: PositionConfigProps) => {
  const { config, getEffectiveConfig } = useDevice();
  const { registerFields, trackChange, removeChange: removeFieldChange } =
    useFieldRegistry();
  const { t } = useTranslation("config");

  const section = { type: "config", variant: "position" } as const;

  const fieldGroups = [
    // ... field definitions (same as before)
  ];

  // Register fields on mount
  useEffect(() => {
    const metadata = createFieldMetadata(section, fieldGroups);
    registerFields(section, metadata);
  }, [registerFields]);

  const onSubmit = (data: PositionValidation) => {
    // Track individual field changes
    const originalData = config.position;

    (Object.keys(data) as Array<keyof PositionValidation>).forEach((fieldName) => {
      const newValue = data[fieldName];
      const oldValue = originalData[fieldName];

      if (newValue !== oldValue) {
        trackChange(section, fieldName as string, newValue, oldValue);
      } else {
        removeFieldChange(section, fieldName as string);
      }
    });
  };

  return (
    <DynamicForm<PositionValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={PositionValidationSchema}
      defaultValues={config.position}
      values={getEffectiveConfig("position")}
      fieldGroups={fieldGroups}
    />
  );
};
```

## Key Changes:

1. **Add imports:**
   ```typescript
   import { createFieldMetadata, useFieldRegistry } from "@core/services/fieldRegistry";
   import { useEffect } from "react";
   ```

2. **Remove from useDevice destructuring:**
   - ~~`setChange`~~
   - ~~`removeChange`~~

3. **Add useFieldRegistry:**
   ```typescript
   const { registerFields, trackChange, removeChange: removeFieldChange } = useFieldRegistry();
   ```

4. **Define section:**
   ```typescript
   const section = { type: "config", variant: "position" } as const;
   ```

5. **Extract fieldGroups** to a const before the return statement

6. **Add useEffect** for field registration

7. **Update onSubmit** to track individual fields

8. **Pass fieldGroups** as a variable (not inline)

## Module Config Components

For module config components (like MQTT, Serial, etc.), use:
```typescript
const section = { type: "moduleConfig", variant: "mqtt" } as const;
```

## Channel Components

For channel components, use:
```typescript
const section = { type: "channel", variant: "channel" } as const;
```

## Important Notes:

- The field registry automatically handles reactivity
- Changes are tracked at the field level, not config level
- Activity panel will now show field names like "Region" instead of just "LoRa Config"
- Search will work across all registered fields
- No need to manually track change counts - the registry handles it
