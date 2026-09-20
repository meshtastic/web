export enum MessageState {
  Pending = "pending",
  Ack = "ack",
  Relayed = "relayed",
  Failed = "failed",
}

// These values deliberately allow Failed to replace Relayed while Ack remains
// terminal: Pending < Relayed < Failed < Ack.
const messageStatePrecedence: Record<MessageState, number> = {
  [MessageState.Pending]: 1,
  [MessageState.Relayed]: 2,
  [MessageState.Failed]: 3,
  [MessageState.Ack]: 4,
};

export function getMessageStatePrecedence(state: MessageState): number {
  return messageStatePrecedence[state];
}

export function shouldApplyMessageStateUpdate(
  current: MessageState,
  next: MessageState,
): boolean {
  return getMessageStatePrecedence(next) >= getMessageStatePrecedence(current);
}
