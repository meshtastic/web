import { useDocumentVisible } from "@core/hooks/useDocumentVisible.ts";
import type { ChatUnread } from "@core/kmp/chat.ts";
import {
  type ConversationKey,
  conversationKeyString,
  parseConversationKey,
} from "@core/storage/types.ts";
import { useEffect } from "react";

/**
 * Keeps `conversation` read while it is on screen and the tab is in the
 * foreground: it is the active conversation then (which marks it read and
 * stops counting text that arrives in it). A hidden tab counts again.
 */
export function useMarkReadWhileVisible(
  unread: Pick<ChatUnread, "setActive"> | undefined,
  conversation: ConversationKey,
): void {
  const visible = useDocumentVisible();
  // A string, so callers may pass a fresh key object every render.
  const key = conversationKeyString(conversation);
  useEffect(() => {
    if (!unread || !visible) {
      return;
    }
    unread.setActive(parseConversationKey(key));
    return () => unread.setActive(undefined);
  }, [unread, key, visible]);
}
