import { create, toBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { Result } from "better-result";
import type { ResultType } from "better-result";
import type { MeshClient } from "../../../core/client/MeshClient.ts";
import { sendAdminMessage } from "../../device/infrastructure/AdminMessageSender.ts";

export async function setFixedPosition(
  client: MeshClient,
  latitude: number,
  longitude: number,
): Promise<ResultType<number, Error>> {
  try {
    const position = create(Protobuf.Mesh.PositionSchema, {
      latitudeI: Math.floor(latitude / 1e-7),
      longitudeI: Math.floor(longitude / 1e-7),
    });
    const id = await sendAdminMessage(
      client,
      { case: "setFixedPosition", value: position },
      "self",
      undefined,
      true,
      false,
    );
    return Result.ok(id);
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)));
  }
}

export async function removeFixedPosition(client: MeshClient): Promise<ResultType<number, Error>> {
  try {
    const id = await sendAdminMessage(
      client,
      { case: "removeFixedPosition", value: true },
      "self",
      undefined,
      true,
      false,
    );
    return Result.ok(id);
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)));
  }
}

export async function setPosition(
  client: MeshClient,
  position: Protobuf.Mesh.Position,
): Promise<ResultType<number, Error>> {
  try {
    const id = await client.sendPacket(
      toBinary(Protobuf.Mesh.PositionSchema, position),
      Protobuf.Portnums.PortNum.POSITION_APP,
      "self",
    );
    return Result.ok(id);
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)));
  }
}

export async function requestPosition(
  client: MeshClient,
  destination: number,
): Promise<ResultType<number, Error>> {
  try {
    const id = await client.sendPacket(
      new Uint8Array(),
      Protobuf.Portnums.PortNum.POSITION_APP,
      destination,
    );
    return Result.ok(id);
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)));
  }
}
