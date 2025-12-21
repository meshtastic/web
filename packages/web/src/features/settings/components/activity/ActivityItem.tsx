import type { ConfigChangeKey } from "@shared/components/Settings/types.ts";
import { Badge } from "@shared/components/ui/badge";
import { Hash, Layers, RadioTower } from "lucide-react";
import type { ActivityItem as ActivityItemType } from "./types.ts";
import { formatRelativeTime } from "./utils.ts";

interface ActivityItemProps {
  item: ActivityItemType;
  onRemove: (key: ConfigChangeKey) => void;
}

export function ActivityItem({ item, onRemove }: ActivityItemProps) {
  const IconComponent =
    item.type === "config"
      ? RadioTower
      : item.type === "moduleConfig"
        ? Layers
        : Hash;

  return (
    <div className="group relative flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors">
      <div className="shrink-0 mt-0.5">
        <IconComponent className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm md:text-base font-medium truncate">
            {item.label}
          </p>
          <Badge variant="secondary" className="text-xs shrink-0">
            {item.category}
          </Badge>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground">
          {formatRelativeTime(item.timestamp)}
        </p>
      </div>

      {/* <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onRemove(item.key)}
        title="Remove this change"
      >
        <X className="h-3 w-3" />
      </Button> */}
    </div>
  );
}
