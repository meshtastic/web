import { Switch } from "@shared/components/ui/switch";
import { cn } from "@shared/utils/cn";

export const ActionToggle = ({
  icon: Icon,
  label,
  checked,
  onCheckedChange,
  checkedClassName,
}: {
  icon: React.ElementType;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  checkedClassName?: string;
}) => (
  <div className="flex items-center justify-between w-full p-3">
    <div className="flex items-center gap-3">
      <Icon
        className={cn(
          "h-5 w-5 text-muted-foreground",
          checked && checkedClassName,
        )}
      />
      <span>{label}</span>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);
