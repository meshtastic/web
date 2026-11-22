import { useNodeRows } from "@components/Nodes/useNodeRows.ts";
import type { NodeRow } from "@core/nodes/nodeRow.ts";
import { nodeIdSuffix } from "@core/utils/nodeIdentity.ts";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { BubbleSender } from "./MessageBubble.tsx";

export interface MessagingDirectory {
  /** Every known node, this radio included. */
  readonly rows: readonly NodeRow[];
  readonly byNum: ReadonlyMap<number, NodeRow>;
  /** Channel index each node was last heard on. */
  readonly channelOf: (nodeNum: number) => number | undefined;
  readonly myNodeNum?: number;
  /** Epoch ms of the ticking clock the rows were aged against. */
  readonly now: number;
  /** Long name, short name, or "Meshtastic 5A97". Stable while names don't change. */
  readonly nameOf: (nodeNum: number) => string;
  readonly sender: (nodeNum: number) => BubbleSender;
}

/**
 * Node names, avatars and presence for the Messages screen. The name
 * lookups keep their identity until a name or initials actually change, so
 * memoised bubbles don't re-render on every telemetry tick.
 */
export function useMessagingDirectory(): MessagingDirectory {
  const { t } = useTranslation("common");
  const { rows, sources, myNodeNum, now } = useNodeRows();

  const byNum = useMemo(
    () => new Map(rows.map((row) => [row.num, row])),
    [rows],
  );
  const channels = useMemo(
    () => new Map(sources.map((node) => [node.num, node.channel])),
    [sources],
  );
  const channelOf = useCallback(
    (nodeNum: number) => channels.get(nodeNum),
    [channels],
  );

  const identitySignature = rows
    .map((row) => `${row.num}\u0000${row.name}\u0000${row.initials}`)
    .join("\u0001");
  // Rebuilt from the signature, so it changes only when names do.
  const identities = useMemo(
    () =>
      new Map(
        identitySignature
          .split("\u0001")
          .filter(Boolean)
          .map((entry) => {
            const [num = "0", name = "", initials = ""] = entry.split("\u0000");
            return [Number(num), { name, initials }] as const;
          }),
      ),
    [identitySignature],
  );

  const nameOf = useCallback(
    (nodeNum: number) =>
      identities.get(nodeNum)?.name ??
      t("fallbackName", { last4: nodeIdSuffix(nodeNum) }),
    [identities, t],
  );
  const sender = useCallback(
    (nodeNum: number): BubbleSender => {
      const known = identities.get(nodeNum);
      return {
        nodeNum,
        name:
          known?.name ?? t("fallbackName", { last4: nodeIdSuffix(nodeNum) }),
        initials: known?.initials ?? nodeIdSuffix(nodeNum),
      };
    },
    [identities, t],
  );

  // Changes with the rows (telemetry); depend on `nameOf` / `sender` where
  // stability matters.
  return useMemo(
    () => ({
      rows,
      byNum,
      channelOf,
      ...(myNodeNum === undefined ? {} : { myNodeNum }),
      now,
      nameOf,
      sender,
    }),
    [rows, byNum, channelOf, myNodeNum, now, nameOf, sender],
  );
}
