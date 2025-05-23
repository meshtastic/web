import { cn } from "@core/utils/cn.ts";
import { LockKeyholeOpenIcon, StarIcon } from "lucide-react";
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/UI/Tooltip.tsx";
import { useTranslation } from "react-i18next";

type RGBColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

interface AvatarProps {
  text: string | number;
  size?: "sm" | "lg";
  className?: string;
  showError?: boolean;
  showFavorite?: boolean;
}

class ColorUtils {
  static hexToRgb(hex: number): RGBColor {
    return {
      r: (hex & 0xff0000) >> 16,
      g: (hex & 0x00ff00) >> 8,
      b: hex & 0x0000ff,
      a: 255,
    };
  }

  static rgbToHex(color: RGBColor): number {
    return (
      (Math.round(color.a) << 24) |
      (Math.round(color.r) << 16) |
      (Math.round(color.g) << 8) |
      Math.round(color.b)
    );
  }

  static isLight(color: RGBColor): boolean {
    const brightness = (color.r * 299 + color.g * 587 + color.b * 114) / 1000;
    return brightness > 127.5;
  }
}

const getColorFromText = (text: string): RGBColor => {
  if (!text) {
    return { r: 0, g: 0, b: 0, a: 255 };
  }
  let hash = 0;
  for (let i = 0; i < text?.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }

  return {
    r: (hash & 0xff0000) >> 16,
    g: (hash & 0x00ff00) >> 8,
    b: hash & 0x0000ff,
    a: 255,
  };
};

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
  const isLight = ColorUtils.isLight(bgColor);
  const textColor = isLight ? "#000000" : "#FFFFFF";
  const initials = safeText?.slice(0, 4) ?? t("common_unknown_short");

  return (
    <div
      className={cn(
        `relative flex items-center justify-center rounded-full font-semibold 
`,
        sizes[size],
        className,
      )}
      style={{
        backgroundColor: `rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`,
        color: textColor,
      }}
    >
      {showFavorite
        ? (
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
                Favorite
                <TooltipArrow className="fill-slate-800 dark:fill-slate-600" />
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
        : null}
      {showError
        ? (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <LockKeyholeOpenIcon
                  className="absolute -bottom-0.5 -right-0.5 z-10 size-4 text-red-500 stroke-3"
                  aria-hidden="true"
                />
              </TooltipTrigger>
              <TooltipContent className="bg-slate-800 dark:bg-slate-600 text-white px-4 py-1 rounded text-xs">
                Node error
                <TooltipArrow className="fill-slate-800 dark:fill-slate-600" />
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
        : null}
      <p className="p-1">
        {initials}
      </p>
    </div>
  );
};
