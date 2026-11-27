import { AdminError, type AdminVariant } from "@core/kmp/admin.ts";
import { base64Encode } from "@bufbuild/protobuf/wire";
import type { AdminResultJs } from "@meshtastic/sdk-kmp";
import { Result } from "better-result";
import type { NodeRow } from "./nodeRow.ts";

/**
 * Whether this radio can manage another node over the mesh, learned by
 * asking it for its device metadata:
 * - `authorized`: it answered, so it lists this radio's key as an admin key;
 * - `unauthorized`: it refused (NOT_AUTHORIZED / ADMIN_PUBLIC_KEY_UNAUTHORIZED);
 * - `unreachable`: no answer in time (timeout, no route, retransmits used up).
 */
export type AdminAccess = "authorized" | "unauthorized" | "unreachable";

/** How long a check waits for the node's answer. */
export const ADMIN_ACCESS_TIMEOUT_MS = 30_000;

/**
 * Failure reasons from the SDK facade (`AdminResultJs.reason`) that mean
 * the request or its answer got lost on the way: the SDK's "retry" routing
 * errors (`suggestedAction()` in RoutingErrors.kt) plus its own timeout and
 * lost link. A remote MAX_RETRANSMIT arrives here only once the SDK has
 * waited out its own deadline.
 */
const UNREACHABLE_REASONS: ReadonlySet<string> = new Set([
  "timeout",
  "node-unreachable",
  "NO_ROUTE",
  "GOT_NAK",
  "NO_INTERFACE",
  "MAX_RETRANSMIT",
  "NO_RESPONSE",
]);

/**
 * What a failed admin request says about access to the node: it refused
 * this radio (`unauthorized`), or the request or its answer got lost
 * (`unreachable`). Anything else (rate limit, a lost link to the radio) is
 * `undefined`.
 */
export function adminFailureKind(
  error: Error,
): Exclude<AdminAccess, "authorized"> | undefined {
  const reason = error instanceof AdminError ? error.reason : undefined;
  if (reason === "unauthorized") return "unauthorized";
  if (reason !== undefined && UNREACHABLE_REASONS.has(reason)) {
    return "unreachable";
  }
  return undefined;
}

export interface AdminAccessDeps {
  sendAdmin: (
    variant: AdminVariant,
    dest: number,
  ) => Promise<Result<AdminResultJs, Error>>;
  /** Remembers (or forgets) the node for this radio. */
  setAdminAccess: (nodeNum: number, authorized: boolean) => void;
  timeoutMs?: number;
}

/**
 * The node details action is offered only where it can work: another node
 * whose public key we know, from a radio that has a key pair of its own.
 */
export const canCheckAdminAccess = (
  row: Pick<NodeRow, "isSelf" | "publicKey">,
  localPublicKey: Uint8Array | undefined,
): boolean =>
  !row.isSelf &&
  row.publicKey !== undefined &&
  localPublicKey !== undefined &&
  localPublicKey.length > 0;

const NO_NODES: readonly number[] = [];

/**
 * The nodes this radio can manage, as far as its current key goes: a list
 * learned under another key (regenerated since), or saved before keys were
 * recorded, counts as empty.
 */
export const rememberedAdminAccess = (
  device: { adminAccessNodes: readonly number[]; adminAccessKey?: string },
  localPublicKey: Uint8Array | undefined,
): readonly number[] =>
  localPublicKey !== undefined &&
  localPublicKey.length > 0 &&
  device.adminAccessKey === base64Encode(localPublicKey)
    ? device.adminAccessNodes
    : NO_NODES;

const DEADLINE = Symbol("deadline");

/**
 * Sends one get_device_metadata request to `nodeNum` and sorts the answer.
 * A reply remembers the node; a refusal forgets it; silence changes
 * nothing. Anything else (rate limit, a lost link to the radio) is an error.
 */
export async function checkAdminAccess(
  deps: AdminAccessDeps,
  nodeNum: number,
): Promise<Result<AdminAccess, Error>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<typeof DEADLINE>((resolve) => {
    timer = setTimeout(
      () => resolve(DEADLINE),
      deps.timeoutMs ?? ADMIN_ACCESS_TIMEOUT_MS,
    );
  });
  const sent = await Result.tryPromise({
    try: () =>
      Promise.race([
        deps.sendAdmin(
          { case: "getDeviceMetadataRequest", value: true },
          nodeNum,
        ),
        deadline,
      ]),
    catch: (cause) =>
      cause instanceof Error ? cause : new Error(String(cause)),
  }).finally(() => clearTimeout(timer));

  if (Result.isError(sent)) {
    return Result.err(sent.error);
  }
  const outcome = sent.value;
  if (outcome === DEADLINE) {
    return Result.ok("unreachable");
  }
  if (Result.isOk(outcome)) {
    deps.setAdminAccess(nodeNum, true);
    return Result.ok("authorized");
  }
  const kind = adminFailureKind(outcome.error);
  if (kind === "unauthorized") {
    deps.setAdminAccess(nodeNum, false);
  }
  return kind === undefined ? Result.err(outcome.error) : Result.ok(kind);
}
