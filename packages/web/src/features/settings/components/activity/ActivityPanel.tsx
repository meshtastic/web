import { Button } from "@shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@shared/components/ui/sheet";
import { formatQuantity } from "@shared/utils/string.ts";
import { FileEdit, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ActivityList } from "./ActivityList.tsx";
import { useActivityChanges } from "./useActivityChanges.ts";

interface ActivityPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivityPanel({ open, onOpenChange }: ActivityPanelProps) {
  const { t } = useTranslation("config");

  const { activityItems, totalCount, removeChange, removeAllChanges } =
    useActivityChanges();

  const handleClearAll = () => {
    if (confirm(t("settings.activityList.discardChanges"))) {
      removeAllChanges();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-96 flex flex-col p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            {t("settings.activityList.pendingChanges")}
          </SheetTitle>
          <SheetDescription>
            {t("settings.activityList.changesWaitingToSave", {
              num: formatQuantity(totalCount, {
                one: t("common:unit.change.one"),
                other: t("common:unit.change.plural"),
              }),
            })}
          </SheetDescription>
        </SheetHeader>

        <ActivityList items={activityItems} onRemove={removeChange} />

        {totalCount > 0 && (
          <div className="p-4 border-t bg-muted/50 space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleClearAll}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t("settings.activityList.clearAllChanges")}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
