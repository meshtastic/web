type RGBColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

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

export const getColorFromText = (text: string): RGBColor => {
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

export const getAvatarColors = (text: string | number | undefined): { bgColor: string; textColor: string } => {
  const safeText = text?.toString() || '';
  const bgColorRGB = getColorFromText(safeText);
  const isLight = ColorUtils.isLight(bgColorRGB);
  const textColor = isLight ? "#000000" : "#FFFFFF";
  const bgColor = `rgb(${bgColorRGB.r}, ${bgColorRGB.g}, ${bgColorRGB.b})`;
  return { bgColor, textColor };
};
