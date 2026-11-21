import {
  radiusNames,
  shadowNames,
  typeScaleNames,
} from "@core/theme/tokens.ts";
import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Teaches tailwind-merge the named theme steps from src/index.css. Without
 * this, `text-meta` is treated like a text colour and dropped next to
 * `text-muted`, and `rounded-bubble` / `shadow-popover` do not override the
 * stock steps.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [...typeScaleNames],
      radius: [...radiusNames],
      shadow: [...shadowNames],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
