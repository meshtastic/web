# Field Registry Migration Example

This shows how the new field registry system works.

## How to Use

### 1. Register fields when component mounts

```typescript
import { useFieldRegistry, createFieldMetadata } from "@core/services/fieldRegistry";

export const LoRa = ({ onFormInit }: LoRaConfigProps) => {
  const { registerFields, trackChange, removeChange } = useFieldRegistry();
  const { t } = useTranslation("config");

  const section = { type: "config", variant: "lora" } as const;

  const fieldGroups = [
    {
      label: t("lora.title"),
      description: t("lora.description"),
      fields: [
        {
          type: "select",
          name: "region",
          label: t("lora.region.label"),
          description: t("lora.region.description"),
          properties: { enumValue: Protobuf.Config.Config_LoRaConfig_RegionCode },
        },
        // ... more fields
      ],
    },
  ];

  // Register fields on mount
  useEffect(() => {
    const metadata = createFieldMetadata(section, fieldGroups);
    registerFields(section, metadata);
  }, []);

  // Track changes in onSubmit
  const onSubmit = (data: LoRaValidation) => {
    if (deepCompareConfig(config.lora, data, true)) {
      removeChange(section, "region"); // Remove if no changes
      return;
    }

    // Track each changed field
    Object.keys(data).forEach((fieldName) => {
      if (data[fieldName] !== config.lora[fieldName]) {
        trackChange(section, fieldName, data[fieldName], config.lora[fieldName]);
      }
    });
  };
}
```

### 2. Search fields

```typescript
const SearchBar = () => {
  const { searchFields } = useFieldRegistry();
  const [query, setQuery] = useState("");

  const results = searchFields(query);

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      {results.map(({ field, matchType }) => (
        <div key={field.fieldName}>
          {field.label} - {field.section.variant}
          <small>{matchType}</small>
        </div>
      ))}
    </div>
  );
};
```

### 3. Display activity

```typescript
const ActivityPanel = () => {
  const { getAllChanges, getField, removeChange } = useFieldRegistry();
  const changes = getAllChanges();

  return (
    <div>
      {changes.map((change) => {
        const field = getField(change.section, change.fieldName);
        return (
          <div key={`${change.section.variant}:${change.fieldName}`}>
            <strong>{field?.label || change.fieldName}</strong>
            <p>Section: {change.section.variant}</p>
            <p>Changed: {formatRelativeTime(change.timestamp)}</p>
            <button onClick={() => removeChange(change.section, change.fieldName)}>
              Remove
            </button>
          </div>
        );
      })}
    </div>
  );
};
```

## Benefits

1. **Single source of truth** - Field metadata lives in one place
2. **Automatic search** - All fields are searchable without extra code
3. **Better activity tracking** - Shows actual field labels, not just section names
4. **Type safe** - ConfigSection is a discriminated union
5. **Reactive** - Uses useSyncExternalStore for automatic re-renders
6. **Colocated** - Field definitions stay with their config components

## Migration Steps

1. Keep existing field definitions in component files
2. Add `useFieldRegistry` hook and register fields on mount
3. Update `onSubmit` to use `trackChange` instead of deviceStore's `setChange`
4. Update Activity component to use `getAllChanges()`
5. Update Search to use `searchFields()`
6. Remove old change registry from deviceStore
