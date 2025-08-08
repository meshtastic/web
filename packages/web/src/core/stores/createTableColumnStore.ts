import type { TableColumn } from "@core/hooks/useColumnManager.ts";
import { produce } from "immer";

export interface TableStoreConfig<T extends TableColumn> {
  defaultColumns: T[];
  storeName?: string;
}

export interface TableStoreActions<T extends TableColumn> {
  updateColumnVisibility: (columnId: string, visible: boolean) => void;
  updateColumn: (columnId: string, updates: Partial<T>) => void;
  resetColumnsToDefault: () => void;
  setColumns: (columns: T[]) => void;
}

export interface TableStoreState<T extends TableColumn> {
  columns: T[];
}

/**
 * Factory function to create column management state and actions
 * Can be used within any Zustand store or as a standalone solution
 */
export function createTableColumnStore<T extends TableColumn>(
  config: TableStoreConfig<T>,
) {
  const { defaultColumns } = config;

  // Initial state
  const initialState: TableStoreState<T> = {
    columns: defaultColumns,
  };

  // Actions factory
  const createActions = (
    set: (fn: (state: any) => void) => void,
    _get?: () => any,
  ): TableStoreActions<T> => ({
    updateColumnVisibility: (columnId: string, visible: boolean) => {
      set(
        produce((draft: any) => {
          // Access the nodesTableColumns property instead of columns
          const columns = draft.nodesTableColumns;
          if (columns) {
            const column = columns.find((col: T) => col.id === columnId);
            if (column) {
              column.visible = visible;
            }
          }
        }),
      );
    },

    updateColumn: (columnId: string, updates: Partial<T>) => {
      set(
        produce((draft: any) => {
          const columns = draft.nodesTableColumns;
          if (columns) {
            const column = columns.find((col: T) => col.id === columnId);
            if (column) {
              Object.assign(column, updates);
            }
          }
        }),
      );
    },

    resetColumnsToDefault: () => {
      set(
        produce((draft: any) => {
          draft.nodesTableColumns = defaultColumns;
        }),
      );
    },

    setColumns: (columns: T[]) => {
      set(
        produce((draft: any) => {
          draft.nodesTableColumns = columns;
        }),
      );
    },
  });

  return {
    initialState,
    createActions,
    defaultColumns,
  };
}

/**
 * Utility type for extracting column store slice from a larger store
 */
export type TableColumnStoreSlice<T extends TableColumn> = TableStoreState<T> &
  TableStoreActions<T>;
