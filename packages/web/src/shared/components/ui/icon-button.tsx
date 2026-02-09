import { Button, type ButtonProps } from "@shared/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { cn } from "@shared/utils/cn";

export interface IconButtonProps extends Omit<ButtonProps, "icon"> {
  tooltip: string;
  icon: React.ReactNode;
}

export function IconButton({
  tooltip,
  icon,
  className,
  ...props
}: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-9 w-9 shrink-0", className)}
          {...props}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
