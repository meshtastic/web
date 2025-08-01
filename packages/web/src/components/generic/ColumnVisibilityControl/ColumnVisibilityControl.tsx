import { useColumnManager } from "@core/hooks/useColumnManager.ts";
import { useAppStore } from "@core/stores/appStore.ts";
import { useTranslation } from "react-i18next";
import { GenericColumnVisibilityControl } from "./GenericColumnVisibilityControl.tsx";

export const ColumnVisibilityControl = () => {
  const { t } = useTranslation("nodes");
  const { nodesTableColumns, updateColumnVisibility, resetColumnsToDefault } =
    useAppStore();

  const columnManager = useColumnManager({
    columns: nodesTableColumns,
    onUpdateColumn: (columnId, updates) => {
      if ("visible" in updates && updates.visible !== undefined) {
        updateColumnVisibility(columnId, updates.visible);
      }
    },
    onResetColumns: resetColumnsToDefault,
  });

  return (
    <GenericColumnVisibilityControl
      columnManager={columnManager}
      title={t("columnSettings.title", "Column Settings")}
      resetLabel={t("columnSettings.reset", "Reset to Default")}
      translateColumnTitle={(title) => (title.includes(".") ? t(title) : title)}
      isColumnDisabled={(column) => column.id === "avatar"}
    />
  );
};
