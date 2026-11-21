/**
 * The web client's version and the commit it was built from, both set at
 * build time by vite.config.ts. Missing or placeholder values come back as
 * `undefined` so screens can say "not available" instead of "undefined".
 */
export interface BuildInfo {
  readonly version: string | undefined;
  /** The full commit SHA, for copying. */
  readonly commit: string | undefined;
  /** The first seven characters, as git shows it. */
  readonly shortCommit: string | undefined;
}

const SHORT_SHA_LENGTH = 7;

const present = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === "" || trimmed === "undefined" || trimmed === "unk"
    ? undefined
    : trimmed;
};

export function buildInfo(rawVersion: unknown, rawCommit: unknown): BuildInfo {
  const version = present(rawVersion);
  const commit = present(rawCommit)?.toLowerCase();
  return {
    version,
    commit,
    shortCommit: commit?.slice(0, SHORT_SHA_LENGTH),
  };
}

export const BUILD_INFO: BuildInfo = buildInfo(
  import.meta.env.VITE_VERSION,
  import.meta.env.VITE_COMMIT_HASH,
);
