# Generic Table Column Management System

This system provides reusable components and hooks for managing table column visibility and state across the application.

## Components

### 1. `useColumnManager` Hook

A generic hook for managing table column state.

```tsx
import { useColumnManager } from "@core/hooks/useColumnManager.ts";

const columnManager = useColumnManager({
  columns: myColumns,
  onUpdateColumn: (columnId, updates) => {
    // Handle column updates
  },
  onResetColumns: () => {
    // Reset to default columns
  },
});

// Access column data
const { visibleColumns, hiddenColumns, visibleCount } = columnManager;

// Update column visibility
columnManager.updateColumnVisibility("columnId", true);
```

### 2. `GenericColumnVisibilityControl` Component

A reusable dropdown component for managing column visibility.

```tsx
import { GenericColumnVisibilityControl } from "@components/generic/ColumnVisibilityControl";

<GenericColumnVisibilityControl
  columnManager={columnManager}
  title="Column Settings"
  resetLabel="Reset to Default"
  translateColumnTitle={(title) => t(title)}
  isColumnDisabled={(column) => column.id === "required"}
/>
```

### 3. `createTableColumnStore` Factory

A factory function for creating column management state within Zustand stores.

```tsx
import { createTableColumnStore } from "@core/stores/createTableColumnStore";

// Define your column type
interface MyTableColumn extends TableColumn {
  customProperty?: string;
}

// Create the column store
const myTableColumnStore = createTableColumnStore({
  defaultColumns: myDefaultColumns,
  storeName: "myTable",
});

// Use in your Zustand store
const useMyStore = create<MyState>()(
  persist(
    (set, get) => {
      const setWrapper = (fn: (state: any) => void) => {
        set(produce<MyState>(fn));
      };
      
      const columnActions = myTableColumnStore.createActions(setWrapper, get);
      
      return {
        ...myTableColumnStore.initialState,
        ...columnActions,
        // ... other state and actions
      };
    }
  )
);
```

## Usage Examples

### Example 1: Simple Table with Column Management

```tsx
import { useColumnManager } from "@core/hooks/useColumnManager.ts";
import { GenericColumnVisibilityControl } from "@components/generic/ColumnVisibilityControl";

const MyTableComponent = () => {
  const [columns, setColumns] = useState(defaultColumns);
  
  const columnManager = useColumnManager({
    columns,
    onUpdateColumn: (columnId, updates) => {
      setColumns(prev => prev.map(col => 
        col.id === columnId ? { ...col, ...updates } : col
      ));
    },
    onResetColumns: () => setColumns(defaultColumns),
  });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <GenericColumnVisibilityControl
          columnManager={columnManager}
          title="Manage Columns"
        />
      </div>
      
      <Table 
        headings={columnManager.visibleColumns.map(col => ({
          title: col.title,
          sortable: col.sortable
        }))}
        rows={data.map(row => ({
          id: row.id,
          cells: columnManager.visibleColumns.map(col => 
            getCellData(row, col.key)
          )
        }))}
      />
    </div>
  );
};
```

### Example 2: Custom Column Types

```tsx
interface CustomTableColumn extends TableColumn {
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: 'currency' | 'date' | 'text';
}

const customColumnStore = createTableColumnStore<CustomTableColumn>({
  defaultColumns: [
    { 
      id: "name", 
      key: "name", 
      title: "Name", 
      visible: true, 
      sortable: true,
      width: 200,
      align: 'left'
    },
    { 
      id: "amount", 
      key: "amount", 
      title: "Amount", 
      visible: true, 
      sortable: true,
      width: 120,
      align: 'right',
      format: 'currency'
    },
  ],
});
```

## Benefits

1. **Reusable**: Can be used across multiple tables in the application
2. **Type-safe**: Full TypeScript support with generic types
3. **Flexible**: Supports custom column properties and behaviors
4. **Consistent**: Uses existing UI components and patterns
5. **Persistent**: Column preferences can be saved to localStorage
6. **Accessible**: Proper ARIA labels and keyboard navigation

## Migration from Existing Systems

If you have existing column management code, you can migrate it step by step:

1. Replace custom column state with `useColumnManager`
2. Replace custom UI components with `GenericColumnVisibilityControl`
3. Optionally refactor stores to use `createTableColumnStore`

The existing `ColumnVisibilityControl` component has been updated to use this new system while maintaining backward compatibility.
