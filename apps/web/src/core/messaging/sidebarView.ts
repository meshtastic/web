import {
  type ConversationFilter,
  filterConversations,
} from "./conversationList.ts";
import { type SidebarConversation, sidebarAccessors } from "./conversations.ts";

/**
 * The sidebar's filter chips. The narrow layout lists channels and DMs in
 * one list, so it adds a "channels" chip the wide sidebar (which has a
 * Channels section) doesn't need.
 */
export type SidebarFilter = ConversationFilter | "channels";

export const desktopSidebarFilters = [
  "all",
  "unread",
  "favorites",
] as const satisfies readonly SidebarFilter[];

export const mobileSidebarFilters = [
  "all",
  "unread",
  "channels",
  "favorites",
] as const satisfies readonly SidebarFilter[];

export interface SidebarSections {
  readonly channels: readonly SidebarConversation[];
  readonly direct: readonly SidebarConversation[];
}

/**
 * Rows for the chip, most recent first. Channels keep their slot order in
 * the wide sidebar (`keepChannelOrder`), where they are a short fixed list.
 */
export const sidebarSections = (
  rows: readonly SidebarConversation[],
  filter: SidebarFilter,
  title: (row: SidebarConversation) => string,
  options: { readonly keepChannelOrder?: boolean } = {},
): SidebarSections => {
  const accessors = sidebarAccessors(title);
  const base: ConversationFilter = filter === "channels" ? "all" : filter;
  const sorted = filterConversations(
    filter === "channels"
      ? rows.filter((row) => row.target.kind === "channel")
      : rows,
    { filter: base, search: "" },
    accessors,
  );
  const channels = options.keepChannelOrder
    ? rows.filter(
        (row) => row.target.kind === "channel" && sorted.includes(row),
      )
    : sorted.filter((row) => row.target.kind === "channel");
  return {
    channels,
    direct: sorted.filter((row) => row.target.kind === "dm"),
  };
};

/** One list mixing channels and DMs by recency (the narrow layout). */
export const mixedRows = (
  rows: readonly SidebarConversation[],
  filter: SidebarFilter,
  title: (row: SidebarConversation) => string,
): SidebarConversation[] =>
  filterConversations(
    filter === "channels"
      ? rows.filter((row) => row.target.kind === "channel")
      : rows,
    { filter: filter === "channels" ? "all" : filter, search: "" },
    sidebarAccessors(title),
  );

/**
 * Who wrote a row's preview, for its prefix: "You: …" when I did, the
 * sender's name on a channel, nothing in a DM from the peer.
 */
export type PreviewAuthor =
  | { readonly kind: "me" }
  | { readonly kind: "sender"; readonly nodeNum: number }
  | { readonly kind: "none" };

export const previewAuthor = (
  row: SidebarConversation,
  myNodeNum: number | undefined,
): PreviewAuthor => {
  const last = row.lastMessage;
  if (!last) {
    return { kind: "none" };
  }
  if (myNodeNum !== undefined && last.from === myNodeNum) {
    return { kind: "me" };
  }
  return row.target.kind === "channel"
    ? { kind: "sender", nodeNum: last.from }
    : { kind: "none" };
};
