export type DotPath = { [key: string]: unknown } | unknown[];

export const dotPaths = <T extends DotPath>(obj: T, prefix = ""): string[] => {
  if (Array.isArray(obj)) {
    return obj.flatMap((v, i) =>
      v && typeof v === "object"
        ? dotPaths(v as DotPath, `${prefix}${i}.`)
        : [`${prefix}${i}`],
    );
  }
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object"
      ? dotPaths(v as DotPath, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
};
