export enum MessageState {
  Pending = "pending",
  Ack = "ack",
  Relayed = "relayed",
  Failed = "failed",
}

const messageStatePrecedence: Record<MessageState, number> = {
  [MessageState.Pending]: 1,
  [MessageState.Failed]: 2,
  [MessageState.Relayed]: 3,
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
