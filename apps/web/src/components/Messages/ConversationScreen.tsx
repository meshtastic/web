import { useNodeActions } from "@components/Nodes/useNodeActions.ts";
import { useNodeLabels } from "@components/Nodes/useNodeLabels.ts";
import {
  DETAILS_PANEL_STORAGE_KEY,
  ShellPage,
} from "@components/Shell/ShellPage.tsx";
import { channelLabel } from "@core/channels/channelLabel.ts";
import { isChannelMuted } from "@core/channels/mute.ts";
import {
  useCanFitDetailsColumn,
  useFitsLabelledActions,
} from "@core/hooks/useIsMobile.ts";
import useLocalStorage from "@core/hooks/useLocalStorage.ts";
import { useActiveClient, useChannel } from "@core/kmp/hooks";
import {
  channelEncryption,
  isPrivatelyEncrypted,
  recentlyHeardOn,
} from "@core/messaging/channelInfo.ts";
import { traceroutesForPeer } from "@core/messaging/tracerouteView.ts";
import { formatLastHeard } from "@core/nodes/format.ts";
import { knownNodeCount } from "@core/nodes/nodeRow.ts";
import { Types } from "@core/protobuf.ts";
import {
  type ConversationKey,
  conversationKeyString,
} from "@core/storage/types.ts";
import { useDevice } from "@core/stores";
import { formatNodeId } from "@core/utils/nodeIdentity.ts";
import type { LoRaSignalSettings } from "@core/utils/signalQuality.ts";
import { useNavigate } from "@tanstack/react-router";
import { type ReactNode, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChatHeaderActions, ChatHeaderIdentity } from "./ChatHeader.tsx";
import { ConversationThread } from "./ConversationThread.tsx";
import { ChannelDetailsPanel, DirectDetailsPanel } from "./DetailsPanels.tsx";
import { useMarkReadWhileVisible } from "./useMarkReadWhileVisible.ts";
import type { MessagingDirectory } from "./useMessagingDirectory.ts";

export interface ConversationScreenProps {
  conversation: ConversationKey;
  directory: MessagingDirectory;
  /** Wide layout's conversation sidebar; none on narrow screens. */
  sidebar?: ReactNode;
  sidebarFooter?: ReactNode;
  touch: boolean;
}

const readBoolean = (value: string): boolean => value === "true";

/**
 * One open conversation: header, message list, composer and details
 * panel, wired to the chat client. Stays mounted across conversations (so
 * the shell and sidebar don't remount); the thread inside is keyed.
 */
export const ConversationScreen = ({
  conversation,
  directory,
  sidebar,
  sidebarFooter,
  touch,
}: ConversationScreenProps) => {
  const { t, i18n } = useTranslation("messages");
  const locale = i18n.language;
  const navigate = useNavigate();
  const client = useActiveClient();
  const connected = client !== undefined;
  const { traceroutes, config, setDialogOpen } = useDevice();
  const [, setDetailsOpen] = useLocalStorage<boolean>(
    DETAILS_PANEL_STORAGE_KEY,
    true,
    { serializer: String, deserializer: readBoolean },
  );
  const key = conversationKeyString(conversation);
  // Which conversation asked to be cleared; switching drops the request.
  const [confirmClearFor, setConfirmClearFor] = useState<string | undefined>(
    undefined,
  );

  const isDm = conversation.kind === "direct";
  const peer = conversation.kind === "direct" ? conversation.peer : undefined;
  const channelIndex =
    conversation.kind === "channel" ? conversation.channel : 0;
  const channel = useChannel(channelIndex);
  const peerRow = peer === undefined ? undefined : directory.byNum.get(peer);
  const nodeLabels = useNodeLabels(directory.now);
  // Same definition as the Nodes screen's "known" count: this radio excluded.
  const knownNodes = useMemo(
    () => knownNodeCount(directory.rows),
    [directory.rows],
  );
  const nodeActions = useNodeActions(peerRow);

  useMarkReadWhileVisible(client?.chat.unread, conversation);

  const destination: Types.Destination = peer ?? "broadcast";
  const sendChannel = isDm ? Types.ChannelNumber.Primary : channelIndex;

  const title =
    peer !== undefined
      ? directory.nameOf(peer)
      : channelLabel({ index: channelIndex, name: channel?.settings?.name }, t);

  const traces = useMemo(
    () => (peer === undefined ? [] : traceroutesForPeer(traceroutes, peer)),
    [traceroutes, peer],
  );

  // By value: the device store hands out a new config object on updates.
  const modemPreset = config.lora?.modemPreset;
  const usePreset = config.lora?.usePreset;
  const spreadFactor = config.lora?.spreadFactor;
  const lora = useMemo<LoRaSignalSettings>(
    () => ({
      ...(modemPreset === undefined ? {} : { modemPreset }),
      ...(usePreset === undefined ? {} : { usePreset }),
      ...(spreadFactor === undefined ? {} : { spreadFactor }),
    }),
    [modemPreset, usePreset, spreadFactor],
  );

  // Header subtitle and composer hint.
  const encryption = channelEncryption(channel?.settings?.psk);
  const muted = !isDm && isChannelMuted(channel);
  const peerHasKey = Boolean(peerRow?.publicKey?.length);
  const secure = isDm ? peerHasKey : isPrivatelyEncrypted(encryption);
  const subtitle = isDm
    ? [
        peerHasKey ? t("header.endToEnd") : t("header.channelKey"),
        peerRow ? nodeLabels.hops(peerRow) : undefined,
        peerRow?.lastHeardMs !== undefined
          ? t("header.heardAgo", {
              time: formatLastHeard(peerRow.lastHeardMs, directory.now, locale),
            })
          : t("header.neverHeard"),
      ]
    : [
        encryption === "none"
          ? t("header.notEncrypted")
          : encryption === "defaultKey"
            ? t("header.defaultKey")
            : t("header.encrypted"),
        t("header.channelNumber", { index: channelIndex }),
        t("header.nodesKnown", {
          count: knownNodes,
        }),
      ];
  const hopLimit = config.lora?.hopLimit;
  const hint = isDm
    ? peerHasKey
      ? t("composer.hintDmPki", { name: title })
      : t("composer.hintDmPsk", { name: title })
    : [
        t("composer.hintKeys"),
        hopLimit ? t("composer.hintHops", { count: hopLimit }) : undefined,
      ]
        .filter(Boolean)
        .join(" · ");

  // Only the details column has its own close; the drawer brings one.
  const fitsDetailsColumn = useCanFitDetailsColumn();
  const fitsLabelledActions = useFitsLabelledActions();
  const closeDetails =
    touch || !fitsDetailsColumn ? undefined : () => setDetailsOpen(false);

  const heard = useMemo(() => {
    if (isDm) {
      return [];
    }
    const nodes = directory.rows.map((row) => ({
      row,
      num: row.num,
      isSelf: row.isSelf,
      ...(row.lastHeardMs === undefined
        ? {}
        : { lastHeardMs: row.lastHeardMs }),
      ...(directory.channelOf(row.num) === undefined
        ? {}
        : { channel: directory.channelOf(row.num) }),
    }));
    return recentlyHeardOn(nodes, channelIndex, directory.now).map(
      ({ row }) => ({
        num: row.num,
        name: row.name,
        initials: row.initials,
        meta: t("channelDetails.heardMeta", {
          hops: nodeLabels.hops(row),
          time: nodeLabels.lastHeard(row),
        }),
      }),
    );
  }, [isDm, directory, channelIndex, nodeLabels, t]);

  const details = isDm ? (
    <DirectDetailsPanel
      row={peerRow}
      labels={nodeLabels}
      actions={nodeActions}
      fallbackName={title}
      fallbackId={formatNodeId(peer ?? 0)}
      onClose={closeDetails}
    />
  ) : (
    <ChannelDetailsPanel
      primary={channelIndex === 0}
      encryption={encryption}
      muted={muted}
      heard={heard}
      totalNodes={knownNodes}
      onShareQr={() => setDialogOpen("QR", true)}
      onOpenNode={(num) =>
        void navigate({
          to: "/messages/$type/$chatId",
          params: { type: "direct", chatId: num },
        })
      }
      onClose={closeDetails}
    />
  );

  return (
    <ShellPage
      label={title}
      hideLabel
      noPadding
      leading={
        <ChatHeaderIdentity
          kind={isDm ? "dm" : "channel"}
          title={title}
          {...(peerRow ? { initials: peerRow.initials } : {})}
          {...(peer === undefined ? {} : { nodeNum: peer })}
          online={peerRow?.isOnline ?? false}
          subtitle={subtitle.filter(Boolean).join(" · ")}
          secure={secure}
          {...(isDm
            ? {
                lockTitle: peerHasKey
                  ? t("header.pkiTooltip")
                  : t("header.pskTooltip"),
              }
            : {})}
          {...(touch ? { backLabel: t("header.back") } : {})}
          {...(muted ? { mutedLabel: t("channelDetails.muted") } : {})}
        />
      }
      trailing={
        <ChatHeaderActions
          kind={isDm ? "dm" : "channel"}
          compact={touch || !fitsLabelledActions}
          connected={connected}
          {...(isDm
            ? {
                onTraceroute: nodeActions.traceroute,
                onRequestPosition: nodeActions.requestPosition,
                ...(peerRow?.lngLat
                  ? { onShowOnMap: nodeActions.showOnMap }
                  : {}),
              }
            : {
                onShowOnMap: () => void navigate({ to: "/map" }),
                onChannelSettings: () =>
                  void navigate({ to: "/settings/channels" }),
              })}
          onClearConversation={() => setConfirmClearFor(key)}
          onDeleteAllMessages={() => setDialogOpen("deleteMessages", true)}
        />
      }
      sidebar={sidebar}
      sidebarLabel={t("sidebar.title")}
      sidebarFooter={sidebarFooter}
      details={details}
      detailsLabel={isDm ? t("header.nodeDetails") : t("header.channelDetails")}
      contentClassName="bg-chat"
    >
      <ConversationThread
        key={key}
        conversation={conversation}
        title={title}
        hint={hint}
        destination={destination}
        channel={sendChannel}
        connected={connected}
        traceroutes={traces}
        sender={directory.sender}
        nameOf={directory.nameOf}
        {...(directory.myNodeNum === undefined
          ? {}
          : { myNodeNum: directory.myNodeNum })}
        lora={lora}
        muted={muted}
        touch={touch}
        confirmClear={confirmClearFor === key}
        onConfirmClearChange={(open) =>
          setConfirmClearFor(open ? key : undefined)
        }
        onClear={() => void client?.chat.clearConversation(conversation)}
      />
    </ShellPage>
  );
};
