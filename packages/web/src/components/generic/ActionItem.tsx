import { ChevronRightIcon } from "lucide-react";

export const ActionItem = ({
  icon: Icon,
  label,
  onClick,
  showChevron = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  showChevron?: boolean;
}) => (
  <button
    onClick={onClick}
    className="flex items-center justify-between w-full p-3 rounded-md hover:bg-muted/50 transition-colors"
    type="button"
  >
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <span className="text-sm md:text-base">{label}</span>
    </div>
    {showChevron && (
      <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
    )}
  </button>
);
