/**
 * Display helpers for the Security section's key rows. Pure.
 */

import {
  formatNodeId,
  initialsFor,
  nodeDisplayName,
} from "@core/utils/nodeIdentity.ts";
import { base64Encode } from "@bufbuild/protobuf/wire";

/** Shown in place of a hidden private key; fixed length, so it leaks nothing. */
export const MASKED_KEY = "•".repeat(28);

export const ADMIN_KEY_SLOTS = 3;

export interface AdminKeySlots {
  /** Slots holding a key, in order. */
  readonly filled: readonly {
    readonly index: number;
    readonly value: string;
  }[];
  /** First empty slot, where "Add admin key" puts the next key. */
  readonly nextEmpty: number | undefined;
}

/** Which of the radio's admin key slots hold a key (an empty string is empty). */
export function adminKeySlots(keys: readonly string[]): AdminKeySlots {
  const slots = Array.from(
    { length: ADMIN_KEY_SLOTS },
    (_, index) => keys[index]?.trim() ?? "",
  );
  const filled = slots.flatMap((value, index) =>
    value === "" ? [] : [{ index, value }],
  );
  const empty = slots.findIndex((value) => value === "");
  return { filled, nextEmpty: empty === -1 ? undefined : empty };
}

/** A known radio whose public key can become an admin key. */
export interface AdminKeyCandidate {
  readonly num: number;
  readonly name: string;
  readonly shortName?: string;
  /** `!1234abcd`. */
  readonly id: string;
  readonly initials: string;
  /** Base64, as the admin key fields hold it. */
  readonly key: string;
  /** The user checked this key against the radio itself. */
  readonly verified: boolean;
}

interface CandidateSource {
  readonly num: number;
  readonly user?: {
    readonly longName?: string;
    readonly shortName?: string;
    readonly publicKey?: Uint8Array;
  };
  readonly isKeyManuallyVerified?: boolean;
}

/**
 * Known radios that could manage this one: those with a public key, other
 * than this radio and those already in an admin slot. Sorted by name.
 */
export function adminKeyCandidates(
  nodes: readonly CandidateSource[],
  options: {
    readonly myNodeNum?: number;
    readonly takenKeys: readonly string[];
    readonly fallbackName: (idSuffix: string) => string;
  },
): AdminKeyCandidate[] {
  const taken = new Set(options.takenKeys.map((key) => key.trim()));
  return nodes
    .flatMap((node) => {
      const publicKey = node.user?.publicKey;
      if (node.num === options.myNodeNum || !publicKey?.length) return [];
      const key = base64Encode(publicKey);
      if (taken.has(key)) return [];
      const shortName = node.user?.shortName?.trim();
      const names = { longName: node.user?.longName, shortName };
      return [
        {
          num: node.num,
          name: nodeDisplayName(names, node.num, options.fallbackName),
          shortName: shortName || undefined,
          id: formatNodeId(node.num),
          initials: initialsFor(names, node.num),
          key,
          verified: node.isKeyManuallyVerified ?? false,
        },
      ];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
