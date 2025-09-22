import {
  AvatarFallback,
  Avatar as ShadcnAvatar,
} from "@app/components/UI/avatar";
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@app/components/UI/tooltip.tsx";
import { getColorFromText, isLightColor } from "@app/core/utils/color";
import { cn } from "@core/utils/cn";
import { LockKeyholeOpenIcon, StarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MeshAvatarProps {
  text: string | number;
  size?: "sm";
  className?: string;
  showError?: boolean;
  showFavorite?: boolean;
}

export function MeshAvatar({
  text,
  size = "sm",
  className,
  showError = false,
  showFavorite = false,
}: MeshAvatarProps) {
  const { t } = useTranslation();

  const sizes = {
    sm: "size-11 font-normal text-xs",
  };

  const safeText = text?.toString().toUpperCase();
  const bgColor = getColorFromText(safeText);
  const isLight = isLightColor(bgColor);
  const textColor = isLight ? "#000000" : "#FFFFFF";
  const initials = safeText?.slice(0, 4) ?? t("unknown.shortName");

  return (
    <div className="relative inline-flex">
      <ShadcnAvatar
        className={cn(
          sizes[size],
          "bg-[rgb(var(--bg-r),var(--bg-g),var(--bg-b))]",
          "flex items-center justify-cente rounded-3xl text-white",
          className,
        )}
        style={
          {
            "--bg-r": bgColor.r,
            "--bg-g": bgColor.g,
            "--bg-b": bgColor.b,
            color: textColor,
          } as React.CSSProperties
        }
      >
        <AvatarFallback className="bg-transparent p-2">
          {initials}
        </AvatarFallback>
      </ShadcnAvatar>

      {/* Favorite badge */}
      {showFavorite && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <StarIcon
                className="absolute -top-0.5 -right-0.5 z-10 size-4 stroke-1 fill-yellow-400"
                aria-hidden="true"
                style={{
                  color: `rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`,
                }}
              />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-800 dark:bg-slate-600 text-white px-3 py-1 rounded text-xs">
              {t("nodeDetail.favorite.label", { ns: "nodes" })}
              <TooltipArrow className="fill-slate-800 dark:fill-slate-600" />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Error badge */}
      {showError && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <LockKeyholeOpenIcon
                className="absolute -bottom-0.5 -right-0.5 z-10 size-4 text-red-500 stroke-3"
                aria-hidden="true"
              />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-800 dark:bg-slate-600 text-white px-3 py-1 rounded text-xs">
              {t("nodeDetail.error.label", { ns: "nodes" })}
              <TooltipArrow className="fill-slate-800 dark:fill-slate-600" />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
