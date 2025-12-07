import { Avatar, AvatarFallback } from "@components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/ui/tooltip";
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
}

export const NodeAvatar = ({
  nodeNum,
  longName,
  size = "sm",
  showError = false,
  showFavorite = false,
  className,
}: NodeAvatarProps) => {
  const { t } = useTranslation();

  const { bgColor, textColor } = getAvatarColors(nodeNum);
  const initials = (longName || nodeNum?.toString() || "")
    .slice(0, 4)
    .toUpperCase();

  const avatarSizeClasses = {
    xs: "h-6 w-6 text-[8px]",
    sm: "h-10 w-10 text-xs",
    lg: "h-16 w-16 text-lg",
  };

  return (
    <div className={cn("relative rounded-full", className)}>
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
