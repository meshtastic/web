import { Switch } from "@components/ui/switch";

export const ActionToggle = ({
  icon: Icon,
  label,
  checked,
  onCheckedChange,
}: {
  icon: React.ElementType;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) => (
  <div className="flex items-center justify-between w-full p-3">
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <span>{label}</span>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);
