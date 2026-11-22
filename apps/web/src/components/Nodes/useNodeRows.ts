import {
  type NodeInfoWithStatus,
  useMyNodeAsProto,
  useNodesAsProto,
} from "@core/hooks/useNodesAsProto.ts";
import { type NodeRow, toNodeRow } from "@core/nodes/nodeRow.ts";
import { useDevice } from "@core/stores";
import { reuseUnchangedRows } from "@core/nodes/rowCache.ts";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNow } from "./useNow.ts";

export interface NodeRowsResult {
  /** Every known node, this device included. */
  readonly rows: readonly NodeRow[];
  /** Same order as `rows`; the proto the advanced filter reads. */
  readonly sources: readonly NodeInfoWithStatus[];
  readonly myNodeNum?: number;
  readonly now: number;
}

/** Known nodes as view-model rows, aged against a ticking clock. */
export function useNodeRows(): NodeRowsResult {
  const { t } = useTranslation("nodes");
  const sources = useNodesAsProto();
  const myNode = useMyNodeAsProto();
  const { config } = useDevice();
  const lora = config.lora;
  const now = useNow();
  const fallbackName = useCallback(
    (last4: string) => t("fallbackName", { last4 }),
    [t],
  );

  const fresh = useMemo(
    () =>
      sources.map((node) =>
        toNodeRow(node, {
          now,
          myNodeNum: myNode?.num,
          myPosition: myNode?.position,
          lora,
          fallbackName,
        }),
      ),
    [sources, now, myNode?.num, myNode?.position, lora, fallbackName],
  );

  // Every node update rebuilds every row; keep the objects of rows that
  // didn't change so memoised rows and pins skip re-rendering.
  const [cache, setCache] = useState<{
    fresh: readonly NodeRow[];
    rows: readonly NodeRow[];
  }>(() => ({ fresh, rows: fresh }));
  let rows = cache.rows;
  if (cache.fresh !== fresh) {
    rows = reuseUnchangedRows(cache.rows, fresh);
    setCache({ fresh, rows });
  }

  return { rows, sources, myNodeNum: myNode?.num, now };
}
