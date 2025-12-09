import { Avatar, AvatarFallback } from "@components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/ui/tooltip";
import { useAppStore, useDevice } from "@core/stores";
import { getAvatarColors } from "@core/utils/color";
import { cn } from "@core/utils/cn";
import { LockKeyholeOpenIcon, StarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface NodeAvatarProps {
  nodeNum: string | number;
  longName?: string; // Optional long name for initials
  size?: "xs" | "sm" | "lg";
  className?: string;
  showError?: boolean;
  showFavorite?: boolean;
  clickable?: boolean; // If false, disables click behavior
  onClick?: () => void; // Custom click handler (overrides default)
}

export const NodeAvatar = ({
  nodeNum,
  longName,
  size = "sm",
  showError = false,
  showFavorite = false,
  clickable = true,
  onClick,
  className,
}: NodeAvatarProps) => {
  const { t } = useTranslation();
  const { setNodeNumDetails } = useAppStore();
  const { setDialogOpen } = useDevice();

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
    if (!clickable) return;

    // Stop propagation to prevent parent click handlers from firing
    e.stopPropagation();

    if (onClick) {
      onClick();
    } else {
      // Default behavior: open node details drawer
      const nodeNumber = typeof nodeNum === "string" ? parseInt(nodeNum, 10) : nodeNum;
      setNodeNumDetails(nodeNumber);
      setDialogOpen("nodeDetails", true);
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-full",
        clickable && "cursor-pointer hover:opacity-80 transition-opacity",
        className
      )}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (clickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleClick(e);
        }
      }}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `View details for node ${nodeNum}` : undefined}
    >
      <Avatar className={`${avatarSizeClasses[size]}`}>
        <AvatarFallback bgColor={bgColor} textColor={textColor}>
          {initials}
        </AvatarFallback>
      </Avatar>

      {showFavorite && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <StarIcon
                className="absolute -top-0.5 -right-0.5 z-10 h-4 w-4 stroke-1 fill-yellow-400"
                aria-hidden="true"
                style={{
                  color: bgColor, // Use the generated background color for the star stroke
                }}
              />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-800 dark:bg-slate-600 px-4 py-1 text-xs text-white rounded">
              {t("nodeDetail.favorite.label", { ns: "nodes" })}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {showError && (
        <TooltipProvider delayDuration={300}>
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
        </TooltipProvider>
      )}
    </div>
  );
};
