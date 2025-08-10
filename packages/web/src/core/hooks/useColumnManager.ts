import { useCallback, useMemo } from "react";

export interface TableColumn {
  id: string;
  key: string;
  title: string;
  visible: boolean;
  sortable: boolean;
}

export interface ColumnManagerConfig<T extends TableColumn = TableColumn> {
  columns: T[];
  onUpdateColumn: (columnId: string, updates: Partial<T>) => void;
  onResetColumns: () => void;
}

export interface UseColumnManagerReturn<T extends TableColumn = TableColumn> {
  allColumns: T[];
  visibleColumns: T[];
  hiddenColumns: T[];
  visibleCount: number;
  totalCount: number;
  updateColumnVisibility: (columnId: string, visible: boolean) => void;
  toggleColumnVisibility: (columnId: string) => void;
  resetColumns: () => void;
  isColumnVisible: (columnId: string) => boolean;
  getColumn: (columnId: string) => T | undefined;
}

/**
 * Generic hook for managing table column visibility and state
 * Can be used with any table that needs column management
 */
export function useColumnManager<T extends TableColumn = TableColumn>({
  columns,
  onUpdateColumn,
  onResetColumns,
}: ColumnManagerConfig<T>): UseColumnManagerReturn<T> {
  const visibleColumns = useMemo(
    () => columns.filter((col) => col.visible),
    [columns],
  );

  const hiddenColumns = useMemo(
    () => columns.filter((col) => !col.visible),
    [columns],
  );

  const updateColumnVisibility = useCallback(
    (columnId: string, visible: boolean) => {
      onUpdateColumn(columnId, { visible } as Partial<T>);
    },
    [onUpdateColumn],
  );

  const toggleColumnVisibility = useCallback(
    (columnId: string) => {
      const column = columns.find((col) => col.id === columnId);
      if (column) {
        updateColumnVisibility(columnId, !column.visible);
      }
    },
    [columns, updateColumnVisibility],
  );

  const isColumnVisible = useCallback(
    (columnId: string) => {
      return columns.find((col) => col.id === columnId)?.visible ?? false;
    },
    [columns],
  );

  const getColumn = useCallback(
    (columnId: string) => {
      return columns.find((col) => col.id === columnId);
    },
    [columns],
  );

  return {
    allColumns: columns,
    visibleColumns,
    hiddenColumns,
    visibleCount: visibleColumns.length,
    totalCount: columns.length,
    updateColumnVisibility,
    toggleColumnVisibility,
    resetColumns: onResetColumns,
    isColumnVisible,
    getColumn,
  };
}
