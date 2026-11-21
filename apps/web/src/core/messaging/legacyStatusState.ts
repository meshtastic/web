import { MessageState } from "@core/messaging/messageEnums.ts";

/**
 * The pre-SDK message state enum that `messageStatus` (the delivery
 * details presentation) still takes, under a name that doesn't clash with
 * the storage `MessageState`.
 */
export const LegacyMessageState = MessageState;
