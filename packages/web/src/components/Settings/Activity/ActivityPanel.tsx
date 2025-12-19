import { formatQuantity } from "@app/core/utils/string.ts";
import { Button } from "@components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@components/ui/sheet";
import { FileEdit, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ActivityList } from "./ActivityList.tsx";
import { useActivityChanges } from "./useActivityChanges.ts";

interface ActivityPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivityPanel({ open, onOpenChange }: ActivityPanelProps) {
  const { t } = useTranslation("ui");

  const { activityItems, totalCount, removeChange, clearAllChanges } =
    useActivityChanges();

  const handleClearAll = () => {
    if (confirm(t("activityList.discardChanges"))) {
      clearAllChanges();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-96 flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            {t("activityList.pendingChanges")}
          </SheetTitle>
          <SheetDescription>
            {t("activityList.changesWaitingToSave", {
              num: formatQuantity(totalCount, {
                one: t("unit.change.one"),
                other: t("unit.change.plural"),
              }),
            })}
          </SheetDescription>
        </SheetHeader>

        {/* Activity List */}
        <ActivityList items={activityItems} onRemove={removeChange} />

        {/* Footer Actions */}
        {totalCount > 0 && (
          <div className="p-4 border-t bg-muted/50 space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleClearAll}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t("activityList.clearAllChanges")}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
