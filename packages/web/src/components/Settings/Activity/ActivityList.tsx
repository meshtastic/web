import { ScrollArea } from "@components/ui/scroll-area";
import type { ConfigChangeKey } from "@components/Settings/types.ts";
import { CheckCircle2 } from "lucide-react";
import type { ActivityItem as ActivityItemType } from "./types.ts";
import { ActivityItem } from "./ActivityItem.tsx";
import { groupByCategory } from "./utils.ts";
import { useTranslation } from "react-i18next";

interface ActivityListProps {
  items: ActivityItemType[];
  onRemove: (key: ConfigChangeKey) => void;
}

export function ActivityList({ items, onRemove }: ActivityListProps) {
  const { t } = useTranslation("ui");

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">{t("noPendingChanges")}</p>
        <p className="text-xs text-muted-foreground mt-1">{t("emptyPage")}</p>
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
              {group.category} ({group.items.length})
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
