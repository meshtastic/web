import type { ConfigChangeKey } from "@shared/components/Settings/types.ts";
import { ScrollArea } from "@shared/components/ui/scroll-area";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ActivityItem } from "./ActivityItem.tsx";
import type { ActivityItem as ActivityItemType } from "./types.ts";
import { groupByCategory } from "./utils.ts";

interface ActivityListProps {
  items: ActivityItemType[];
  onRemove: (key: ConfigChangeKey) => void;
}

export function ActivityList({ items, onRemove }: ActivityListProps) {
  const { t } = useTranslation("config");

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          {t("activityList.noPendingChanges")}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {t("activityList.emptyPage")}
        </p>
      </div>
    );
  }

  const groupedItems = groupByCategory(items);

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-4 p-4">
        {groupedItems.map((group) => (
          <div key={group.category}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              {t(`activityList.categories.${group.category}`)} (
              {group.items.length})
            </h3>
            <div className="space-y-2">
              {group.items.map((item) => (
                <ActivityItem key={item.id} item={item} onRemove={onRemove} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
