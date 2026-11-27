import { useToast } from "@core/hooks/useToast.ts";
import { useActiveClient } from "@core/kmp/hooks";
import {
  canCheckAdminAccess,
  checkAdminAccess,
} from "@core/nodes/adminAccess.ts";
import type { NodeRow } from "@core/nodes/nodeRow.ts";
import { useDevice } from "@core/stores";
import { base64Encode } from "@bufbuild/protobuf/wire";
import { Result } from "better-result";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

/** A node that refused this radio's key, for the explanation dialog. */
export interface AdminAccessRefusal {
  readonly name: string;
  /** This radio's public key, base64. */
  readonly localPublicKey: string;
}

/** The remote-admin quick action for one node, ready for the panel. */
export interface AdminAccessControl {
  /** The node can be checked at all (see `canCheckAdminAccess`). */
  readonly available: boolean;
  readonly checking: boolean;
  /** It answered an earlier check. */
  readonly authorized: boolean;
  readonly check: () => void;
  readonly refusal?: AdminAccessRefusal;
  readonly dismissRefusal: () => void;
}

/**
 * Checks, on request, whether this radio can manage `node` remotely, and
 * remembers the answer for this radio. Toasts say what happened; a refusal
 * opens an explanation with this radio's key to copy.
 */
export function useAdminAccess(node: NodeRow | undefined): AdminAccessControl {
  const { t } = useTranslation("nodes");
  const connection = useActiveClient();
  const { toast } = useToast();
  const { config, setAdminAccess } = useDevice();
  const localPublicKey = config.security?.publicKey;
  const [inFlight, setInFlight] = useState<ReadonlySet<number>>(new Set());
  const [refusal, setRefusal] = useState<AdminAccessRefusal | undefined>();

  const num = node?.num;
  const name = node?.name ?? "";
  const available =
    node !== undefined && canCheckAdminAccess(node, localPublicKey);

  const check = useCallback(() => {
    if (
      !connection ||
      !available ||
      num === undefined ||
      !localPublicKey ||
      inFlight.has(num)
    ) {
      return;
    }
    const settle = (next: boolean) =>
      setInFlight((current) => {
        const copy = new Set(current);
        if (next) {
          copy.add(num);
        } else {
          copy.delete(num);
        }
        return copy;
      });
    settle(true);
    const keyText = base64Encode(localPublicKey);
    void checkAdminAccess(
      {
        sendAdmin: (variant, dest) => connection.sendAdmin(variant, dest),
        setAdminAccess: (nodeNum, authorized) =>
          setAdminAccess(nodeNum, authorized, keyText),
      },
      num,
    ).then((result) => {
      settle(false);
      if (Result.isError(result)) {
        toast({ title: t("toast.adminAccessFailed", { name }) });
        return;
      }
      switch (result.value) {
        case "authorized":
          toast({ title: t("toast.adminAccessGranted", { name }) });
          return;
        case "unauthorized":
          setRefusal({ name, localPublicKey: keyText });
          return;
        case "unreachable":
          toast({ title: t("toast.adminAccessUnreachable", { name }) });
          return;
      }
    });
  }, [
    connection,
    available,
    num,
    name,
    localPublicKey,
    inFlight,
    setAdminAccess,
    toast,
    t,
  ]);

  const dismissRefusal = useCallback(() => setRefusal(undefined), []);

  return useMemo<AdminAccessControl>(
    () => ({
      available,
      checking: num !== undefined && inFlight.has(num),
      authorized: node?.hasAdminAccess ?? false,
      check,
      refusal,
      dismissRefusal,
    }),
    [
      available,
      num,
      inFlight,
      node?.hasAdminAccess,
      check,
      refusal,
      dismissRefusal,
    ],
  );
}
