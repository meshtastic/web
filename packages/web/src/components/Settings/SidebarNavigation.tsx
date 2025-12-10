import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import { Card } from "@components/ui/card";
import { ScrollArea } from "@components/ui/scroll-area";
import { cn } from "@core/utils/cn";

interface NavigationItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  onClick: () => void;
  changeCount?: number;
}

interface SidebarNavigationProps {
  items: NavigationItem[];
}

export const SidebarNavigation = ({ items }: SidebarNavigationProps) => {
  return (
    <Card className="h-full border-0 border-r ">
      <div className="p-4 border-b">
        <h2 className="font-semibold">Configuration</h2>
      </div>
      <ScrollArea className="flex-1 rounded-full">
        <div className="p-2 space-y-1 w-16">
          {items.map((item) => (
            <Button
              key={item.key}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3",
                item.isActive && "bg-accent text-accent-foreground",
              )}
              onClick={item.onClick}
            >
              <item.icon className="h-4 w-4" />
              <span className="text-sm">{item.label}</span>
              {item.changeCount && item.changeCount > 0 && (
                <Badge
                  variant="rounded"
                  className="h-5 min-w-5 justify-center bg-primary text-primary-foreground"
                >
                  {item.changeCount}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
