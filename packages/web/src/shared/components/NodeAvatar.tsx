import { Avatar, AvatarFallback } from "@shared/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { cn } from "@shared/utils/cn";
import { getAvatarColors } from "@shared/utils/color";
import { useUIStore } from "@state/index.ts";
import { LockKeyholeOpenIcon, StarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface NodeAvatarProps {
  nodeNum: string | number;
  longName?: string; // Optional long name for initials
  size?: "xs" | "sm" | "lg";
  className?: string;
  showError?: boolean;
  showFavorite?: boolean;
  showOnline?: boolean; // Show online status indicator
  clickable?: boolean; // If false, disables click behavior
  onClick?: () => void;
}

export const NodeAvatar = ({
  nodeNum,
  longName,
  size = "sm",
  showError = false,
  showFavorite = false,
  showOnline = false,
  clickable = true,
  onClick,
  className,
}: NodeAvatarProps) => {
  const { t } = useTranslation();
  const setNodeNumDetails = useUIStore((s) => s.setNodeNumDetails);
  const setDialogOpen = useUIStore((s) => s.setDialogOpen);

  const { bgColor, textColor } = getAvatarColors(nodeNum);
  const initials = (longName || nodeNum?.toString() || "")
    .slice(0, 4)
    .toUpperCase();

  const avatarSizeClasses = {
    xs: "h-6 w-6 text-[8px]",
    sm: "h-10 w-10 text-xs",
    lg: "h-16 w-16 text-lg",
  };

  const handleClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (!clickable) {
      return;
    }

    e.stopPropagation();

    if (onClick) {
      onClick();
    } else {
      const nodeNumber =
        typeof nodeNum === "string" ? parseInt(nodeNum, 10) : nodeNum;
      setNodeNumDetails(nodeNumber);
      setDialogOpen("nodeDetails", true);
    }
  };

  const content = (
    <>
      <Avatar className={`${avatarSizeClasses[size]}`}>
        <AvatarFallback bgColor={bgColor} textColor={textColor}>
          {initials}
        </AvatarFallback>
      </Avatar>

      {showFavorite && (
        <Tooltip>
          <TooltipTrigger asChild>
            <StarIcon
              className="absolute -top-0.5 -right-0.5 z-10 h-4 w-4 fill-yellow-400 text-yellow-500"
              aria-hidden="true"
            />
          </TooltipTrigger>
          <TooltipContent className="px-4 py-1">
            {t("nodeDetail.favorite.label", { ns: "nodes" })}
          </TooltipContent>
        </Tooltip>
      )}

      {showError && (
        <Tooltip>
          <TooltipTrigger asChild>
            <LockKeyholeOpenIcon
              className="absolute -bottom-0.5 -right-0.5 z-10 h-4 w-4 stroke-3 text-red-500"
              aria-hidden="true"
            />
          </TooltipTrigger>
          <TooltipContent className="bg-slate-800 dark:bg-slate-600 px-4 py-1 text-xs text-white rounded">
            {t("nodeDetail.error.label", { ns: "nodes" })}
          </TooltipContent>
        </Tooltip>
      )}

      {showOnline && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="absolute -bottom-0.5 -left-0.5 z-10 h-3 w-3 rounded-full bg-green-500 border-2 border-background"
              aria-hidden="true"
            />
          </TooltipTrigger>
          <TooltipContent className="px-4 py-1">
            {t("nodeDetail.online.label", { ns: "nodes" })}
          </TooltipContent>
        </Tooltip>
      )}
    </>
  );

  if (!clickable) {
    return (
      <div className={cn("relative rounded-full", className)}>{content}</div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "relative rounded-full cursor-pointer hover:opacity-80 transition-opacity",
        className,
      )}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e);
        }
      }}
      tabIndex={0}
      aria-label={`View details for node ${nodeNum}`}
    >
      {content}
    </button>
  );
};
