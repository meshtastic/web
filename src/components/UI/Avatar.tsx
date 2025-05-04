import { cn } from "@core/utils/cn.ts";
import { LockKeyholeOpenIcon } from "lucide-react";

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
  className,
}: AvatarProps) => {
  const sizes = {
    sm: "size-10 text-xs font-light",
    lg: "size-16 text-lg",
  };

  const safeText = text?.toString().toUpperCase();
  const bgColor = getColorFromText(safeText);
  const isLight = ColorUtils.isLight(bgColor);
  const textColor = isLight ? "#000000" : "#FFFFFF";
  const initials = safeText?.slice(0, 4) ?? "UNK";

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
      {showError
        ? (
          <LockKeyholeOpenIcon
            className="absolute bottom-0 right-0 z-10 size-4 text-red-500 stroke-3"
            aria-hidden="true"
          />
        )
        : null}
      <p className="p-1">
        {initials}
      </p>
    </div>
  );
};
