export interface RGBColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

/**
 * Convert a hex number to RGB color
 */
export const hexToRgb = (hex: number): RGBColor => ({
  r: (hex & 0xff0000) >> 16,
  g: (hex & 0x00ff00) >> 8,
  b: hex & 0x0000ff,
});

/**
 * Convert RGB color to hex number
 */
export const rgbToHex = (c: RGBColor): number =>
  (Math.round(c.r) << 16) | (Math.round(c.g) << 8) | Math.round(c.b);

/**
 * Determine if a color is light or dark
 */
export const isLightColor = (c: RGBColor): boolean =>
  (c.r * 299 + c.g * 587 + c.b * 114) / 1000 > 127.5;

/**
 * Extract RGB color from a node number
 */
export const getColorFromNodeNum = (nodeNum: number): RGBColor => {
  const r = (nodeNum & 0xff0000) >> 16;
  const g = (nodeNum & 0x00ff00) >> 8;
  const b = nodeNum & 0x0000ff;

  return { r, g, b };
};

/**
 * Generate a deterministic color from text
 */
export const getColorFromText = (text: string): RGBColor => {
  if (!text) {
    return { r: 0, g: 0, b: 0, a: 255 };
  }
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
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

/**
 * Generate avatar background and text colors from text or number
 */
export const getAvatarColors = (
  text: string | number | undefined,
): { bgColor: string; textColor: string } => {
  const safeText = text?.toString() || "";
  const bgColorRGB = getColorFromText(safeText);
  const isLight = isLightColor(bgColorRGB);
  const textColor = isLight ? "#000000" : "#FFFFFF";
  const bgColor = `rgb(${bgColorRGB.r}, ${bgColorRGB.g}, ${bgColorRGB.b})`;
  return { bgColor, textColor };
};
