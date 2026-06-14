import type { Protobuf } from "@meshtastic/core";
import { Result } from "better-result";
import type { ResultType } from "better-result";
import type { MeshClientPort } from "../../../core/client/MeshClientPort.ts";
import { type MeshError, toMeshError } from "../../../core/errors/MeshError.ts";

/**
 * Application use-cases for the config slice. Each wraps a transport call in a
 * `Result<number, MeshError>` instead of throwing — mirroring the SDK's
 * use-case layer from PR #1050. The returned number is the sent packet id.
 */

export async function beginEditSettings(
  client: MeshClientPort,
): Promise<ResultType<number, MeshError>> {
  try {
    return Result.ok(await client.beginEditSettings());
  } catch (error) {
    return Result.err(toMeshError(error));
  }
}

export async function commitEditSettings(
  client: MeshClientPort,
): Promise<ResultType<number, MeshError>> {
  try {
    return Result.ok(await client.commitEditSettings());
  } catch (error) {
    return Result.err(toMeshError(error));
  }
}

export async function setConfig(
  client: MeshClientPort,
  config: Protobuf.Config.Config,
): Promise<ResultType<number, MeshError>> {
  try {
    return Result.ok(await client.setConfig(config));
  } catch (error) {
    return Result.err(toMeshError(error));
  }
}

export async function setModuleConfig(
  client: MeshClientPort,
  moduleConfig: Protobuf.ModuleConfig.ModuleConfig,
): Promise<ResultType<number, MeshError>> {
  try {
    return Result.ok(await client.setModuleConfig(moduleConfig));
  } catch (error) {
    return Result.err(toMeshError(error));
  }
}
