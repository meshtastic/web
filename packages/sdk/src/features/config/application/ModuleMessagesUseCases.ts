import type * as Protobuf from "@meshtastic/protobufs";
import { Result } from "better-result";
import type { MeshClient } from "../../../core/client/MeshClient.ts";
import { sendAdminMessage } from "../../device/infrastructure/AdminMessageSender.ts";

/**
 * The canned message list and the External Notification ringtone are not part
 * of ModuleConfig. Firmware keeps each one as a single string and reads and
 * writes it through its own admin messages.
 */

/** nanopb max_size 201 for the `|`-separated canned message list. */
export const CANNED_MESSAGES_MAX_BYTES = 200;
/** nanopb max_size 231 for the RTTTL ringtone. */
export const RINGTONE_MAX_BYTES = 230;

const encoder = new TextEncoder();

async function send(
  client: MeshClient,
  payloadVariant: Protobuf.Admin.AdminMessage["payloadVariant"],
): Promise<Result<number, Error>> {
  try {
    return Result.ok(await sendAdminMessage(client, payloadVariant));
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)));
  }
}

function tooLong(what: string, max: number): Error {
  return new Error(`${what} is longer than ${max} bytes`);
}

/** Admin message that sets the canned message list. */
export function cannedMessagesAdminMessage(
  messages: string,
): Protobuf.Admin.AdminMessage["payloadVariant"] {
  return { case: "setCannedMessageModuleMessages", value: messages };
}

/** Admin message that sets the External Notification ringtone. */
export function ringtoneAdminMessage(
  ringtone: string,
): Protobuf.Admin.AdminMessage["payloadVariant"] {
  return { case: "setRingtoneMessage", value: ringtone };
}

/**
 * Ask the device for its canned message list. The answer arrives as a
 * `getCannedMessageModuleMessagesResponse` admin message.
 */
export function requestCannedMessages(
  client: MeshClient,
): Promise<Result<number, Error>> {
  return send(client, {
    case: "getCannedMessageModuleMessagesRequest",
    value: true,
  });
}

export function setCannedMessages(
  client: MeshClient,
  messages: string,
): Promise<Result<number, Error>> {
  if (encoder.encode(messages).length > CANNED_MESSAGES_MAX_BYTES) {
    return Promise.resolve(
      Result.err(tooLong("Canned messages", CANNED_MESSAGES_MAX_BYTES)),
    );
  }
  return send(client, cannedMessagesAdminMessage(messages));
}

/**
 * Ask the device for its ringtone. The answer arrives as a
 * `getRingtoneResponse` admin message.
 */
export function requestRingtone(
  client: MeshClient,
): Promise<Result<number, Error>> {
  return send(client, { case: "getRingtoneRequest", value: true });
}

export function setRingtone(
  client: MeshClient,
  ringtone: string,
): Promise<Result<number, Error>> {
  if (encoder.encode(ringtone).length > RINGTONE_MAX_BYTES) {
    return Promise.resolve(Result.err(tooLong("Ringtone", RINGTONE_MAX_BYTES)));
  }
  return send(client, ringtoneAdminMessage(ringtone));
}
