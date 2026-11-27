import { ChatsEmptyState } from "@components/Messages/ChatsEmptyState.tsx";
import { ConversationScreen } from "@components/Messages/ConversationScreen.tsx";
import { ConversationSidebar } from "@components/Messages/ConversationSidebar.tsx";
import { NewDirectMessageDialog } from "@components/Messages/NewDirectMessageDialog.tsx";
import { useConversationRowViews } from "@components/Messages/useConversationRowViews.ts";
import { useMessagingDirectory } from "@components/Messages/useMessagingDirectory.ts";
import { DeviceCard } from "@components/Shell/DeviceCard.tsx";
import { ShellPage } from "@components/Shell/ShellPage.tsx";
import { IconButton } from "@components/UI/IconButton.tsx";
import { useIsMobile } from "@core/hooks/useIsMobile.ts";
import { useChannels, useConversationSummaries } from "@core/kmp/hooks";
import { useCommandMenuShortcutLabel } from "@components/CommandPalette/useCommandMenuShortcutLabel.ts";
import { recentlyHeard } from "@core/messaging/channelInfo.ts";
import {
  mixedRows,
  type SidebarFilter,
  sidebarSections,
} from "@core/messaging/sidebarView.ts";
import { formatLastHeard } from "@core/nodes/format.ts";
import {
  type ConversationKey,
  conversationKeyString,
} from "@core/storage/types.ts";
import { useAppStore } from "@core/stores";
import { useNavigate, useParams } from "@tanstack/react-router";
import { PencilLineIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

/** The conversation the route names, or undefined. */
const conversationFromParams = (params: {
  type?: "direct" | "broadcast";
  chatId?: number;
}): ConversationKey | undefined => {
  if (params.type === undefined || params.chatId === undefined) {
    return undefined;
  }
  return params.type === "direct"
    ? { kind: "direct", peer: params.chatId }
    : { kind: "channel", channel: params.chatId };
};

const RECENT_NODES = 6;

/**
 * Messages: the conversation sidebar beside either the open conversation
 * or the Chats empty state. On narrow screens the list and a conversation
 * are separate full screens.
 */
export const MessagesPage = () => {
  const { t, i18n } = useTranslation("messages");
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const conversation = conversationFromParams(params);
  const selectedId = conversation
    ? conversationKeyString(conversation)
    : undefined;

  const directory = useMessagingDirectory();
  const channels = useChannels();
  const summaries = useConversationSummaries();
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const [filter, setFilter] = useState<SidebarFilter>("all");
  const [newDmOpen, setNewDmOpen] = useState(false);
  const { byNum } = directory;
  const peer = useCallback(
    (num: number) => {
      const row = byNum.get(num);
      return row
        ? {
            initials: row.initials,
            online: row.isOnline,
            adminAccess: row.hasAdminAccess,
          }
        : undefined;
    },
    [byNum],
  );
  const { title, toView } = useConversationRowViews({
    channels,
    nameOf: directory.nameOf,
    mentionName: directory.mentionName,
    peer,
    ...(directory.myNodeNum === undefined
      ? {}
      : { myNodeNum: directory.myNodeNum }),
    now: directory.now,
  });
  const shortcut = useCommandMenuShortcutLabel();

  const openSearch = useCallback(
    () => setCommandPaletteOpen(true),
    [setCommandPaletteOpen],
  );
  const openNewDm = useCallback(() => setNewDmOpen(true), []);

  const sections = useMemo(() => {
    const { channels: ch, direct } = sidebarSections(
      summaries,
      filter === "channels" ? "all" : filter,
      title,
      { keepChannelOrder: true },
    );
    return { channels: ch.map(toView), direct: direct.map(toView) };
  }, [summaries, filter, title, toView]);

  const mobileRows = useMemo(
    () => mixedRows(summaries, filter, title).map(toView),
    [summaries, filter, title, toView],
  );

  const locale = i18n.language;
  const candidates = useMemo(
    () =>
      [...directory.rows]
        .filter((row) => !row.isSelf && row.isMessageable)
        .sort((a, b) => (b.lastHeardMs ?? 0) - (a.lastHeardMs ?? 0))
        .map((row) => {
          const heard = formatLastHeard(row.lastHeardMs, directory.now, locale);
          return {
            num: row.num,
            name: row.name,
            id: row.id,
            initials: row.initials,
            online: row.isOnline,
            adminAccess: row.hasAdminAccess,
            ...(row.shortName ? { shortName: row.shortName } : {}),
            ...(heard ? { heard: t("newDm.heard", { time: heard }) } : {}),
          };
        }),
    [directory, locale, t],
  );

  const recent = useMemo(
    () =>
      recentlyHeard(
        directory.rows.map((row) => ({
          num: row.num,
          isSelf: row.isSelf,
          name: row.name,
          initials: row.initials,
          ...(row.lastHeardMs === undefined
            ? {}
            : { lastHeardMs: row.lastHeardMs }),
        })),
        RECENT_NODES,
      ).map(({ num, name, initials }) => ({ num, name, initials })),
    [directory.rows],
  );

  const newDmDialog = (
    <NewDirectMessageDialog
      open={newDmOpen}
      onOpenChange={setNewDmOpen}
      candidates={candidates}
      onSelect={(num) => {
        setNewDmOpen(false);
        void navigate({
          to: "/messages/$type/$chatId",
          params: { type: "direct", chatId: num },
        });
      }}
    />
  );

  const sidebar = isMobile ? undefined : (
    <ConversationSidebar
      layout="sections"
      channels={sections.channels}
      direct={sections.direct}
      filter={filter === "channels" ? "all" : filter}
      onFilterChange={setFilter}
      onOpenSearch={openSearch}
      shortcut={shortcut}
      onNewDirectMessage={openNewDm}
      onAddChannel={() => void navigate({ to: "/settings/channels" })}
      {...(selectedId ? { selectedId } : {})}
    />
  );
  const sidebarFooter = isMobile ? undefined : <DeviceCard />;

  if (conversation) {
    return (
      <>
        <ConversationScreen
          conversation={conversation}
          directory={directory}
          sidebar={sidebar}
          sidebarFooter={sidebarFooter}
          touch={isMobile}
        />
        {newDmDialog}
      </>
    );
  }

  if (isMobile) {
    return (
      <ShellPage
        label={t("sidebar.chatsTitle")}
        noPadding
        trailing={
          <IconButton
            aria-label={t("sidebar.newDm")}
            size="touch"
            icon={<PencilLineIcon className="size-5" />}
            onClick={openNewDm}
          />
        }
      >
        <ConversationSidebar
          layout="mixed"
          rows={mobileRows}
          filter={filter}
          onFilterChange={setFilter}
          onOpenSearch={openSearch}
          shortcut={shortcut}
        />
        {newDmDialog}
      </ShellPage>
    );
  }

  return (
    <ShellPage
      label={t("sidebar.title")}
      hideLabel
      noPadding
      sidebar={sidebar}
      sidebarLabel={t("sidebar.title")}
      sidebarFooter={sidebarFooter}
    >
      <ChatsEmptyState
        shortcut={shortcut}
        recent={recent}
        onNewDirectMessage={openNewDm}
        onOpenSearch={openSearch}
      />
      {newDmDialog}
    </ShellPage>
  );
};

export default MessagesPage;
