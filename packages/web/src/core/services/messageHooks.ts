import type { Types } from "@meshtastic/core";
import logger from "./logger.ts";

/**
 * Message Hooks System
 *
 * Provides an extensible way to add handlers for message lifecycle events.
 * Hooks are run sequentially and errors are logged but don't block other hooks.
 *
 * Usage:
 * - Register hooks in setupMessageHooks.ts at app startup
 * - Call run*Hooks() from MessageInput.tsx and subscriptionService.ts
 */

export interface OutgoingMessage {
  text: string;
  to: number | "broadcast";
  channelId?: Types.ChannelNumber;
  replyId?: number;
  wantAck: boolean;
}

export interface IncomingMessage {
  id: number;
  from: number;
  to: number;
  text: string;
  channel: number;
  replyId?: number;
  emoji?: number;
}

/**
 * Hook function types
 */
export type SendHook = (
  message: OutgoingMessage,
  myNodeNum: number,
) => Promise<void>;

export type ReceiveHook = (
  message: IncomingMessage,
  myNodeNum: number,
) => Promise<void>;

export type AckHook = (messageId: number, myNodeNum: number) => Promise<void>;

const sendHooks: SendHook[] = [];
const receiveHooks: ReceiveHook[] = [];
const ackHooks: AckHook[] = [];

/**
 * Register a hook to run when a message is sent
 * @returns Unregister function
 */
export function registerSendHook(hook: SendHook): () => void {
  sendHooks.push(hook);
  logger.debug(
    `[MessageHooks] Registered send hook (total: ${sendHooks.length})`,
  );

  return () => {
    const index = sendHooks.indexOf(hook);
    if (index !== -1) {
      sendHooks.splice(index, 1);
      logger.debug(
        `[MessageHooks] Unregistered send hook (total: ${sendHooks.length})`,
      );
    }
  };
}

/**
 * Register a hook to run when a message is received
 * @returns Unregister function
 */
export function registerReceiveHook(hook: ReceiveHook): () => void {
  receiveHooks.push(hook);
  logger.debug(
    `[MessageHooks] Registered receive hook (total: ${receiveHooks.length})`,
  );

  return () => {
    const index = receiveHooks.indexOf(hook);
    if (index !== -1) {
      receiveHooks.splice(index, 1);
      logger.debug(
        `[MessageHooks] Unregistered receive hook (total: ${receiveHooks.length})`,
      );
    }
  };
}

/**
 * Register a hook to run when an ACK is received
 * @returns Unregister function
 */
export function registerAckHook(hook: AckHook): () => void {
  ackHooks.push(hook);
  logger.debug(
    `[MessageHooks] Registered ack hook (total: ${ackHooks.length})`,
  );

  return () => {
    const index = ackHooks.indexOf(hook);
    if (index !== -1) {
      ackHooks.splice(index, 1);
      logger.debug(
        `[MessageHooks] Unregistered ack hook (total: ${ackHooks.length})`,
      );
    }
  };
}

/**
 * Run all registered send hooks sequentially
 * Errors are logged but don't block other hooks
 */
export async function runSendHooks(
  message: OutgoingMessage,
  myNodeNum: number,
): Promise<void> {
  for (const hook of sendHooks) {
    try {
      await hook(message, myNodeNum);
    } catch (error) {
      logger.error("[MessageHooks] Send hook error:", error);
    }
  }
}

/**
 * Run all registered receive hooks sequentially
 * Errors are logged but don't block other hooks
 */
export async function runReceiveHooks(
  message: IncomingMessage,
  myNodeNum: number,
): Promise<void> {
  for (const hook of receiveHooks) {
    try {
      await hook(message, myNodeNum);
    } catch (error) {
      logger.error("[MessageHooks] Receive hook error:", error);
    }
  }
}

/**
 * Run all registered ACK hooks sequentially
 * Errors are logged but don't block other hooks
 */
export async function runAckHooks(
  messageId: number,
  myNodeNum: number,
): Promise<void> {
  for (const hook of ackHooks) {
    try {
      await hook(messageId, myNodeNum);
    } catch (error) {
      logger.error("[MessageHooks] ACK hook error:", error);
    }
  }
}
