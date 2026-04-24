import * as Protobuf from "@meshtastic/protobufs";
import { create } from "@bufbuild/protobuf";
import { Result } from "better-result";
import type { ResultType } from "better-result";
import type { MeshClient } from "../../../core/client/MeshClient.ts";
import { sendAdminMessage } from "../../device/infrastructure/AdminMessageSender.ts";

export async function setChannel(
  client: MeshClient,
  channel: Protobuf.Channel.Channel,
): Promise<ResultType<number, Error>> {
  try {
    const id = await sendAdminMessage(client, { case: "setChannel", value: channel });
    return Result.ok(id);
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)));
  }
}

export async function getChannel(
  client: MeshClient,
  index: number,
): Promise<ResultType<number, Error>> {
  try {
    const id = await sendAdminMessage(client, { case: "getChannelRequest", value: index + 1 });
    return Result.ok(id);
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)));
  }
}

export async function clearChannel(
  client: MeshClient,
  index: number,
): Promise<ResultType<number, Error>> {
  const channel = create(Protobuf.Channel.ChannelSchema, {
    index,
    role: Protobuf.Channel.Channel_Role.DISABLED,
  });
  return setChannel(client, channel);
}
