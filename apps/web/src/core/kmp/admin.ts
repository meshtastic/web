import { Protobuf } from "@core/protobuf.ts";
import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import type { AdminResultJs, MeshtasticClient } from "@meshtastic/sdk-kmp";
import { Result } from "better-result";

export type AdminVariant = Protobuf.Admin.AdminMessage["payloadVariant"];

export class AdminError extends Error {
  constructor(readonly reason: string) {
    super(`Admin request failed: ${reason}`);
    this.name = "AdminError";
  }
}

export function encodeAdminMessage(
  message: Protobuf.Admin.AdminMessage,
): Uint8Array {
  return toBinary(Protobuf.Admin.AdminMessageSchema, message);
}

export function adminMessage(
  payloadVariant: AdminVariant,
): Protobuf.Admin.AdminMessage {
  return create(Protobuf.Admin.AdminMessageSchema, { payloadVariant });
}

export function toResult(result: AdminResultJs): Result<AdminResultJs, Error> {
  return result.ok
    ? Result.ok(result)
    : Result.err(new AdminError(result.reason ?? "unknown"));
}

/** Sends one admin message to `dest` (the local node when omitted). */
export async function sendAdmin(
  client: MeshtasticClient,
  payloadVariant: AdminVariant,
  dest?: number,
): Promise<Result<AdminResultJs, Error>> {
  return toResult(
    await client
      .admin(dest)
      .send(encodeAdminMessage(adminMessage(payloadVariant))),
  );
}

/** Sends admin messages as one begin/commit settings transaction. */
export async function editSettings(
  client: MeshtasticClient,
  messages: readonly Protobuf.Admin.AdminMessage[],
  dest?: number,
): Promise<Result<void, Error>> {
  const result = await client
    .admin(dest)
    .editSettings(messages.map(encodeAdminMessage));
  return result.ok
    ? Result.ok(undefined)
    : Result.err(new AdminError(result.reason ?? "unknown"));
}

export async function getConfig(
  client: MeshtasticClient,
  type: Protobuf.Admin.AdminMessage_ConfigType,
  dest?: number,
): Promise<Result<Protobuf.Config.Config, Error>> {
  const result = await sendAdmin(
    client,
    { case: "getConfigRequest", value: type },
    dest,
  );
  return decodeValue(result, Protobuf.Config.ConfigSchema);
}

export async function getModuleConfig(
  client: MeshtasticClient,
  type: Protobuf.Admin.AdminMessage_ModuleConfigType,
  dest?: number,
): Promise<Result<Protobuf.ModuleConfig.ModuleConfig, Error>> {
  const result = await sendAdmin(
    client,
    { case: "getModuleConfigRequest", value: type },
    dest,
  );
  return decodeValue(result, Protobuf.ModuleConfig.ModuleConfigSchema);
}

export async function getDeviceMetadata(
  client: MeshtasticClient,
  dest?: number,
): Promise<Result<Protobuf.Mesh.DeviceMetadata, Error>> {
  const result = await sendAdmin(
    client,
    { case: "getDeviceMetadataRequest", value: true },
    dest,
  );
  return decodeValue(result, Protobuf.Mesh.DeviceMetadataSchema);
}

export async function getOwner(
  client: MeshtasticClient,
  dest?: number,
): Promise<Result<Protobuf.Mesh.User, Error>> {
  const result = await sendAdmin(
    client,
    { case: "getOwnerRequest", value: true },
    dest,
  );
  return decodeValue(result, Protobuf.Mesh.UserSchema);
}

export async function getText(
  client: MeshtasticClient,
  payloadVariant: AdminVariant,
  dest?: number,
): Promise<Result<string, Error>> {
  const result = await sendAdmin(client, payloadVariant, dest);
  if (Result.isError(result)) return Result.err(result.error);
  return Result.ok(result.value.text ?? "");
}

function decodeValue<T extends Parameters<typeof fromBinary>[0]>(
  result: Result<AdminResultJs, Error>,
  schema: T,
): Result<ReturnType<typeof fromBinary<T>>, Error> {
  if (Result.isError(result)) return Result.err(result.error);
  const bytes = result.value.value;
  if (!bytes) return Result.err(new AdminError("empty-response"));
  return Result.ok(fromBinary(schema, bytes));
}
