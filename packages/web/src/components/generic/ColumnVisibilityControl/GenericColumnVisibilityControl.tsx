import { Button } from "@components/UI/Button.tsx";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/UI/DropdownMenu.tsx";
import type {
  TableColumn,
  UseColumnManagerReturn,
} from "@core/hooks/useColumnManager.ts";
import { SettingsIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface GenericColumnVisibilityControlProps<
  T extends TableColumn = TableColumn,
> {
  columnManager: UseColumnManagerReturn<T>;
  title?: string;
  resetLabel?: string;
  trigger?: ReactNode;
  className?: string;
  translateColumnTitle?: (title: string) => string;
  isColumnDisabled?: (column: T) => boolean;
}

export function GenericColumnVisibilityControl<
  T extends TableColumn = TableColumn,
>({
  columnManager,
  title = "Column Settings",
  resetLabel = "Reset to Default",
  trigger,
  className,
  translateColumnTitle = (title) => title,
  isColumnDisabled = () => false,
}: GenericColumnVisibilityControlProps<T>) {
  const {
    allColumns,
    visibleCount,
    totalCount,
    updateColumnVisibility,
    resetColumns,
  } = columnManager;

  const defaultTrigger = (
    <Button
      variant="outline"
      size="sm"
      className="ml-2 h-8 px-2 text-xs"
      title={title}
    >
      <SettingsIcon size={14} />
      <span className="ml-1 hidden sm:inline">
        Columns ({visibleCount}/{totalCount})
      </span>
    </Button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || defaultTrigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent className={`w-56 ${className || ""}`} align="end">
        <DropdownMenuLabel>{title}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {allColumns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.visible}
            onCheckedChange={(checked) =>
              updateColumnVisibility(column.id, checked ?? false)
            }
            disabled={isColumnDisabled(column)}
          >
            {translateColumnTitle(column.title)}
          </DropdownMenuCheckboxItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={false}
          onCheckedChange={() => resetColumns()}
        >
          {resetLabel}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
