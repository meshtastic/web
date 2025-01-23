import { cn } from "@app/core/utils/cn";
import type React from "react";

type RGBColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

interface AvatarProps {
  text: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

// biome-ignore lint/complexity/noStaticOnlyClass: stop being annoying Biome 
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

export const Avatar: React.FC<AvatarProps> = ({
  text,
  size = "md",
  className,
}) => {
  console.log(text);

  const sizes = {
    sm: "size-12 text-sm",
    md: "size-12 text-sm",
    lg: "size-16 text-lg",
    xl: "size-29 text-xl",
  };

  // Generate color from text
  const getColorFromText = (): RGBColor => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }

    return {
      r: (hash & 0xff0000) >> 16,
      g: (hash & 0x00ff00) >> 8,
      b: hash & 0x0000ff,
      a: 255,
    };
  };

  const bgColor = getColorFromText();
  const isLight = ColorUtils.isLight(bgColor);
  const textColor = isLight ? "#000000" : "#FFFFFF";
  const initials = text
    .toUpperCase()
    .slice(0, 4);

  return (
    <div
      className={cn(`
        rounded-full 
        flex 
        items-center 
        justify-center 
        font-semibold`,
        sizes[size],
        className)
      }
      style={{
        backgroundColor: `rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`,
        color: textColor,
      }}
    >
      <p className="p-1">{initials}</p>

    </div>
  );
};
