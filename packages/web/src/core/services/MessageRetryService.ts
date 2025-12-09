import { useMessageStore } from "@core/stores/messageStore";
import type { MessageId, MessageState } from "@core/stores/messageStore/types";

/**
 * Service for handling message retries with exponential backoff
 */
export class MessageRetryService {
  /**
   * Retry a message with exponential backoff
   */
  static async retryMessage(deviceId: number, messageId: MessageId): Promise<void> {
    const messageStore = useMessageStore.getState().getMessageStore(deviceId);
    if (!messageStore) {
      console.warn(`[MessageRetryService] No message store found for device ${deviceId}`);
      return;
    }

    const message = messageStore.getMessage(messageId);
    if (!message) {
      console.warn(`[MessageRetryService] Message ${messageId} not found`);
      return;
    }

    if (message.retryCount >= message.maxRetries) {
      console.log(`[MessageRetryService] Message ${messageId} has reached max retries`);
      return;
    }

    if (message.state !== MessageState.Failed) {
      console.log(`[MessageRetryService] Message ${messageId} is not in failed state`);
      return;
    }

    // Calculate exponential backoff delay
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, message.retryCount), maxDelay);

    console.log(
      `[MessageRetryService] Retrying message ${messageId} (attempt ${message.retryCount + 1}/${message.maxRetries}) after ${delay}ms`
    );

    // Wait for backoff period
    await new Promise(resolve => setTimeout(resolve, delay));

    // Create retry message with incremented count
    const retryMessage = {
      text: message.message,
      to: message.type === "direct" ? message.to : "broadcast",
      channelId: message.channel,
      wantAck: true,
      priority: message.priority,
      retryCount: message.retryCount + 1,
      maxRetries: message.maxRetries,
    };

    try {
      // Process through pipeline
      await messageStore.processOutgoingMessage(retryMessage);
      console.log(`[MessageRetryService] Message ${messageId} retry sent successfully`);
    } catch (error) {
      console.error(`[MessageRetryService] Failed to retry message ${messageId}:`, error);
    }
  }

  /**
   * Check if a message can be retried
   */
  static canRetryMessage(deviceId: number, messageId: MessageId): boolean {
    const messageStore = useMessageStore.getState().getMessageStore(deviceId);
    if (!messageStore) return false;

    const message = messageStore.getMessage(messageId);
    if (!message) return false;

    return (
      message.state === MessageState.Failed &&
      message.retryCount < message.maxRetries
    );
  }

  /**
   * Get remaining retry attempts for a message
   */
  static getRemainingRetries(deviceId: number, messageId: MessageId): number {
    const messageStore = useMessageStore.getState().getMessageStore(deviceId);
    if (!messageStore) return 0;

    const message = messageStore.getMessage(messageId);
    if (!message) return 0;

    return Math.max(0, message.maxRetries - message.retryCount);
  }

  /**
   * Calculate next retry delay for a message
   */
  static getNextRetryDelay(deviceId: number, messageId: MessageId): number {
    const messageStore = useMessageStore.getState().getMessageStore(deviceId);
    if (!messageStore) return 0;

    const message = messageStore.getMessage(messageId);
    if (!message) return 0;

    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    return Math.min(baseDelay * Math.pow(2, message.retryCount), maxDelay);
  }
}