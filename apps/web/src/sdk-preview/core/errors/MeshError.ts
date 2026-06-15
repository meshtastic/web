/**
 * Typed error hierarchy mirroring `@meshtastic/sdk` (PR #1050). New application
 * use-cases return `Result<T, MeshError>` instead of throwing; transport-level
 * failures are represented as concrete subclasses so callers can branch on
 * `instanceof` rather than string-matching messages.
 */
export class MeshError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "MeshError";
  }
}

export class ConfigCommitError extends MeshError {
  constructor(section: string, options?: ErrorOptions) {
    super(`Failed to commit config section "${section}"`, options);
    this.name = "ConfigCommitError";
  }
}

/** Wraps an unknown thrown value into a MeshError without losing the cause. */
export function toMeshError(value: unknown): MeshError {
  if (value instanceof MeshError) {
    return value;
  }
  if (value instanceof Error) {
    return new MeshError(value.message, { cause: value });
  }
  return new MeshError(String(value));
}
