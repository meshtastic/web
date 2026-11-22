import { useFavoriteNode } from "@core/hooks/useFavoriteNode.ts";
import { useIgnoreNode } from "@core/hooks/useIgnoreNode.ts";
import { useToast } from "@core/hooks/useToast.ts";
import { useActiveClient } from "@core/kmp/hooks";
import type { NodeRow } from "@core/nodes/nodeRow.ts";
import { NODE_FOCUS_ZOOM } from "@core/nodes/mapView.ts";
import { Protobuf } from "@core/protobuf.ts";
import { useAppStore, useDevice } from "@core/stores";
import { useNavigate } from "@tanstack/react-router";
import { Result } from "better-result";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export interface NodeActions {
  message: () => void;
  showOnMap: () => void;
  traceroute: () => void;
  requestPosition: () => void;
  toggleFavorite: () => void;
  toggleIgnored: () => void;
  verifyKey: () => void;
  remove: () => void;
  /** Opens the full details dialog: telemetry charts and raw data. */
  openAllDetails: () => void;
}

const noop = () => {};

const NO_ACTIONS: NodeActions = {
  message: noop,
  showOnMap: noop,
  traceroute: noop,
  requestPosition: noop,
  toggleFavorite: noop,
  toggleIgnored: noop,
  verifyKey: noop,
  remove: noop,
  openAllDetails: noop,
};

/**
 * Every action the node screens offer, wired to the SDK client, the router
 * and the dialog stores. Components take the result and stay presentational.
 */
export function useNodeActions(node: NodeRow | undefined): NodeActions {
  const { t } = useTranslation("nodes");
  const connection = useActiveClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setDialogOpen } = useDevice();
  const { setNodeNumToBeRemoved, setNodeNumDetails } = useAppStore();
  const { updateFavorite } = useFavoriteNode();
  const { updateIgnored } = useIgnoreNode();

  return useMemo<NodeActions>(() => {
    if (!node) {
      return NO_ACTIONS;
    }
    const num = node.num;
    return {
      message: () => {
        // Direct-message route; keep in step with NodesPage.messageNode.
        void navigate({
          to: "/messages/$type/$chatId",
          params: { type: "direct", chatId: num },
        });
      },
      showOnMap: () => {
        if (!node.lngLat) {
          return;
        }
        const [long, lat] = node.lngLat;
        void navigate({
          to: "/map/$long/$lat/$zoom",
          params: { long, lat, zoom: NODE_FOCUS_ZOOM },
        });
      },
      traceroute: () => {
        if (!connection) {
          return;
        }
        toast({ title: t("toast.sendingTraceroute.title", { ns: "ui" }) });
        void connection.traceRoute(num).then((result) => {
          toast({
            title: Result.isError(result)
              ? t("toast.tracerouteFailed")
              : t("toast.tracerouteSent.title", { ns: "ui" }),
          });
        });
      },
      requestPosition: () => {
        if (!connection) {
          return;
        }
        toast({ title: t("toast.requestingPosition.title", { ns: "ui" }) });
        connection.requestPosition(num).then(
          (outcome) =>
            toast({
              title: outcome.ok
                ? t("toast.positionRequestSent.title", { ns: "ui" })
                : t("toast.positionRequestFailed"),
            }),
          () => toast({ title: t("toast.positionRequestFailed") }),
        );
      },
      toggleFavorite: () =>
        updateFavorite({ nodeNum: num, isFavorite: !node.isFavorite }),
      toggleIgnored: () =>
        updateIgnored({ nodeNum: num, isIgnored: !node.isIgnored }),
      verifyKey: () => {
        if (!connection) {
          return;
        }
        void connection
          .sendKeyVerification(
            Protobuf.Admin.KeyVerificationAdmin_MessageType
              .INITIATE_VERIFICATION,
            num,
            0n,
          )
          .then((result) => {
            if (Result.isError(result)) {
              toast({ title: t("toast.keyVerificationFailed") });
            }
          });
      },
      remove: () => {
        setNodeNumToBeRemoved(num);
        setDialogOpen("nodeRemoval", true);
      },
      openAllDetails: () => {
        setNodeNumDetails(num);
        setDialogOpen("nodeDetails", true);
      },
    };
  }, [
    node,
    connection,
    navigate,
    toast,
    t,
    setDialogOpen,
    setNodeNumToBeRemoved,
    setNodeNumDetails,
    updateFavorite,
    updateIgnored,
  ]);
}
