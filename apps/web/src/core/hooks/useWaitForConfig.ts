import { useSignal } from "@core/kmp/hooks/useSignal.ts";
import { constantSignal } from "@core/kmp/signals.ts";
import { useRemoteSettings } from "@core/settings/remoteContext.ts";
import type {
  RemoteFailure,
  RemoteLoadKey,
  RemoteLoadState,
} from "@core/settings/remoteSettings.ts";
import {
  useDevice,
  type ValidConfigType,
  type ValidModuleConfigType,
} from "@core/stores";

type UseWaitForConfigProps =
  | { configCase: ValidConfigType; moduleConfigCase?: never; owner?: never }
  | {
      configCase?: never;
      moduleConfigCase: ValidModuleConfigType;
      owner?: never;
    }
  | { configCase?: never; moduleConfigCase?: never; owner: true };

/** A remote section that couldn't be read, for the section's error view. */
export class RemoteLoadError extends Error {
  constructor(
    readonly key: RemoteLoadKey,
    readonly reason: RemoteFailure,
  ) {
    super(`Could not read ${key} from the node: ${reason}`);
    this.name = "RemoteLoadError";
  }
}

const NO_LOADS = constantSignal<ReadonlyMap<RemoteLoadKey, RemoteLoadState>>(
  new Map(),
);

/**
 * Suspends until the section's config is here. Locally that is the
 * device's config from the handshake. For a remote node the first call
 * asks the node for it, and a failed read throws a `RemoteLoadError`.
 * `owner` only waits remotely; locally the owner comes from the node list.
 */
export function useWaitForConfig({
  configCase,
  moduleConfigCase,
  owner,
}: UseWaitForConfigProps): void {
  const { config, moduleConfig } = useDevice();
  const remote = useRemoteSettings()?.remote;
  const loads = useSignal(remote?.loads ?? NO_LOADS);

  if (remote) {
    // LocalConfig and Config name their sections alike.
    const key = (
      owner
        ? "owner"
        : configCase
          ? `config:${configCase}`
          : `module:${moduleConfigCase}`
    ) as RemoteLoadKey;
    const state = loads.get(key);
    if (state?.status === "loaded") return;
    if (state?.status === "failed") {
      throw new RemoteLoadError(key, state.reason);
    }
    throw remote.load(key);
  }
  if (owner) return;

  const isDataDefined = configCase
    ? config[configCase] !== undefined
    : moduleConfig[moduleConfigCase as ValidModuleConfigType] !== undefined;

  if (!isDataDefined) {
    throw new Promise<void>(() => {});
  }
}
