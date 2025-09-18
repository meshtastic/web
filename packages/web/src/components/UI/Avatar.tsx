import { getColorFromText, isLightColor } from "@app/core/utils/color";
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/UI/Tooltip.tsx";
import { cn } from "@core/utils/cn.ts";
import { LockKeyholeOpenIcon, StarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AvatarProps {
  text: string | number;
  size?: "sm" | "lg";
  className?: string;
  showError?: boolean;
  showFavorite?: boolean;
}

export const Avatar = ({
  text,
  size = "sm",
  showError = false,
  showFavorite = false,
  className,
}: AvatarProps) => {
  const { t } = useTranslation();

  const sizes = {
    sm: "size-10 text-xs font-light",
    lg: "size-16 text-lg",
  };

  const safeText = text?.toString().toUpperCase();
  const bgColor = getColorFromText(safeText);
  const isLight = isLightColor(bgColor);
  const textColor = isLight ? "#000000" : "#FFFFFF";
  const initials = safeText?.slice(0, 4) ?? t("unknown.shortName");

  return (
    <div
      className={cn(
        `relative flex items-center justify-center rounded-full font-semibold 
`,
        sizes[size],
        "bg-[rgb(var(--bg-r),var(--bg-g),var(--bg-b))]", // allow override with className
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
      {showFavorite ? (
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
            <TooltipContent className="bg-slate-800 dark:bg-slate-600 text-white px-4 py-1 rounded text-xs">
              {t("nodeDetail.favorite.label", { ns: "nodes" })}
              <TooltipArrow className="fill-slate-800 dark:fill-slate-600" />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
      {showError ? (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <LockKeyholeOpenIcon
                className="absolute -bottom-0.5 -right-0.5 z-10 size-4 text-red-500 stroke-3"
                aria-hidden="true"
              />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-800 dark:bg-slate-600 text-white px-4 py-1 rounded text-xs">
              {t("nodeDetail.error.label", { ns: "nodes" })}
              <TooltipArrow className="fill-slate-800 dark:fill-slate-600" />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
      <p className="p-1 text-nowrap">{initials}</p>
    </div>
  );
};
