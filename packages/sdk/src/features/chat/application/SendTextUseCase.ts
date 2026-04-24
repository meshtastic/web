import * as Protobuf from "@meshtastic/protobufs";
import { Result } from "better-result";
import type { ResultType } from "better-result";
import type { MeshClient } from "../../../core/client/MeshClient.ts";
import { ChannelNumber, type Destination, Emitter } from "../../../core/types.ts";

export interface SendTextInput {
  text: string;
  destination?: Destination;
  wantAck?: boolean;
  channel?: ChannelNumber;
  replyId?: number;
  emoji?: number;
}

export class EmptyMessageError extends Error {
  readonly _tag = "EmptyMessageError";
  constructor() {
    super("Message text is empty");
    this.name = "EmptyMessageError";
  }
}

export class MessageTooLongError extends Error {
  readonly _tag = "MessageTooLongError";
  constructor(readonly byteLength: number) {
    super(`Message text encodes to ${byteLength} bytes; max payload is ~228 bytes`);
    this.name = "MessageTooLongError";
  }
}

export type SendTextError = EmptyMessageError | MessageTooLongError | Error;

/** Max safe text payload per Meshtastic firmware (leaves room for overhead in the 256-byte data payload). */
const MAX_TEXT_BYTES = 228;

/**
 * Sends a text message. Returns a Result; the Ok variant is the packet id
 * used to correlate the ack from the device.
 */
export async function sendText(
  client: MeshClient,
  input: SendTextInput,
): Promise<ResultType<number, SendTextError>> {
  if (input.text.length === 0) {
    return Result.err(new EmptyMessageError());
  }

  const destination = input.destination ?? "broadcast";
  const channel = input.channel ?? ChannelNumber.Primary;
  const enc = new TextEncoder();
  const payload = enc.encode(input.text);

  if (payload.length > MAX_TEXT_BYTES) {
    return Result.err(new MessageTooLongError(payload.length));
  }

  client.log.debug(
    Emitter[Emitter.SendText],
    `📤 Sending message to ${destination} on channel ${channel}`,
  );

  try {
    const id = await client.sendPacket(
      payload,
      Protobuf.Portnums.PortNum.TEXT_MESSAGE_APP,
      destination,
      channel,
      input.wantAck,
      false,
      true,
      input.replyId,
      input.emoji,
    );
    return Result.ok(id);
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)));
  }
}
