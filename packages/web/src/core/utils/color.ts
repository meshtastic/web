export interface RGBColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export const hexToRgb = (hex: number): RGBColor => ({
  r: (hex & 0xff0000) >> 16,
  g: (hex & 0x00ff00) >> 8,
  b: hex & 0x0000ff,
  a: 255,
});

export const rgbToHex = (c: RGBColor): number =>
  (Math.round(c.a) << 24) |
  (Math.round(c.r) << 16) |
  (Math.round(c.g) << 8) |
  Math.round(c.b);

export const isLightColor = (c: RGBColor): boolean =>
  (c.r * 299 + c.g * 587 + c.b * 114) / 1000 > 127.5;

export const getColorFromText = (text: string): RGBColor => {
  if (!text) {
    return { r: 0, g: 0, b: 0, a: 255 };
  }

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0; // force 32‑bit
  }
  return {
    r: (hash & 0xff0000) >> 16,
    g: (hash & 0x00ff00) >> 8,
    b: hash & 0x0000ff,
    a: 255,
  };
};
