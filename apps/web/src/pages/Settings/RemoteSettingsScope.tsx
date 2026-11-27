import { create } from "@bufbuild/protobuf";
import { base64Encode } from "@bufbuild/protobuf/wire";
import { Spinner } from "@components/UI/Spinner.tsx";
import { useNodeAsProto } from "@core/hooks/useNodesAsProto.ts";
import { editSettings } from "@core/kmp/admin.ts";
import type { ModuleConfig, RadioConfig } from "@core/kmp/configEditor.ts";
import { useActiveClient, useSignal } from "@core/kmp/hooks";
import { constantSignal } from "@core/kmp/signals.ts";
import { rememberedAdminAccess } from "@core/nodes/adminAccess.ts";
import { Protobuf } from "@core/protobuf.ts";
import {
  RemoteSettingsContext,
  type RemoteSettingsScope,
} from "@core/settings/remoteContext.ts";
import { RemoteSettings } from "@core/settings/remoteSettings.ts";
import { type Device, useDevice } from "@core/stores";
import { useRouterState } from "@tanstack/react-router";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { settingsSearchSchema } from "./sectionProps.ts";

/** The node `?node=` asks to manage, if it is a node number. */
export function useRemoteNodeParam(): number | undefined {
  const search = useRouterState({ select: (state) => state.location.search });
  return settingsSearchSchema.safeParse(search).data?.node;
}

/** What `?node=` resolves to on this radio. */
export type RemoteTarget =
  | { readonly kind: "local" }
  /** This radio's keys haven't arrived yet, so it can't tell. */
  | { readonly kind: "waiting" }
  | {
      readonly kind: "unavailable";
      readonly nodeNum: number;
      readonly reason: "noRadio" | "notSetUp";
    }
  | { readonly kind: "remote"; readonly nodeNum: number };

/**
 * Remote settings open only for a node this radio is known to manage: a
 * check succeeded under this radio's current key. Its own node number
 * opens the local settings.
 */
export function resolveRemoteTarget(input: {
  node: number | undefined;
  connected: boolean;
  myNodeNum: number | undefined;
  localPublicKey: Uint8Array | undefined;
  device: { adminAccessNodes: readonly number[]; adminAccessKey?: string };
}): RemoteTarget {
  const { node } = input;
  if (node === undefined || node === input.myNodeNum) return { kind: "local" };
  if (!input.connected) {
    return { kind: "unavailable", nodeNum: node, reason: "noRadio" };
  }
  // Until the security config arrives there's no key to check against; a
  // radio without a key pair manages no one.
  if (input.localPublicKey === undefined) return { kind: "waiting" };
  if (input.localPublicKey.length === 0) {
    return { kind: "unavailable", nodeNum: node, reason: "notSetUp" };
  }
  const remembered = rememberedAdminAccess(input.device, input.localPublicKey);
  return remembered.includes(node)
    ? { kind: "remote", nodeNum: node }
    : { kind: "unavailable", nodeNum: node, reason: "notSetUp" };
}

const NO_NODE_NUM = constantSignal<number | undefined>(undefined);

/** What `?node=<node>` resolves to now; see `resolveRemoteTarget`. */
export function useRemoteTarget(node: number): RemoteTarget {
  const client = useActiveClient();
  const device = useDevice();
  const myNodeNum = useSignal(client?.device.myNodeNum ?? NO_NODE_NUM);
  return resolveRemoteTarget({
    node,
    connected: client !== undefined,
    myNodeNum,
    localPublicKey: device.config.security?.publicKey,
    device,
  });
}

/** The node's name as this radio knows it, or the usual fallback. */
export function useNodeName(nodeNum: number): string {
  const { t } = useTranslation("common");
  const node = useNodeAsProto(nodeNum);
  const last4 = (nodeNum >>> 0).toString(16).padStart(8, "0").slice(-4);
  return node?.user?.longName || t("fallbackName", { last4 });
}

/**
 * The local device record as remote settings sections see it: config and
 * metadata from the remote node, setters that never touch the store.
 */
export function remoteDevice(
  local: Device,
  radio: RadioConfig,
  modules: ModuleConfig,
  metadata: Protobuf.Mesh.DeviceMetadata | undefined,
): Device {
  const config = create(Protobuf.LocalOnly.LocalConfigSchema, {
    device: radio.device,
    position: radio.position,
    power: radio.power,
    network: radio.network,
    display: radio.display,
    lora: radio.lora,
    bluetooth: radio.bluetooth,
    security: radio.security,
  });
  // `create` copies the fields LocalModuleConfig has and ignores the rest.
  const moduleConfig = create(
    Protobuf.LocalOnly.LocalModuleConfigSchema,
    modules as Parameters<
      typeof create<typeof Protobuf.LocalOnly.LocalModuleConfigSchema>
    >[1],
  );
  return {
    ...local,
    config,
    moduleConfig,
    metadata: new Map(metadata ? [[0, metadata]] : []),
    getEffectiveConfig: (variant) => config[variant],
    getEffectiveModuleConfig: (variant) => moduleConfig[variant],
    setConfig: () => {},
    setModuleConfig: () => {},
  };
}

const NO_RADIO = constantSignal<RadioConfig>({});
const NO_MODULES = constantSignal<ModuleConfig>({});
const NO_METADATA = constantSignal<Protobuf.Mesh.DeviceMetadata | undefined>(
  undefined,
);

/**
 * Settings for `nodeNum`, read and written over the mesh. Everything
 * inside reads the node through `RemoteSettingsContext`; nothing it loads
 * goes into the local radio's stores. Leaving drops unsaved edits.
 */
export function RemoteSettingsProvider({
  nodeNum,
  children,
}: {
  nodeNum: number;
  children: ReactNode;
}) {
  const client = useActiveClient();
  const local = useDevice();
  const name = useNodeName(nodeNum);
  const [remote, setRemote] = useState<RemoteSettings>();

  // A refusal forgets the node under this radio's current key.
  const localKey = local.config.security?.publicKey;
  const { setAdminAccess } = local;
  const forget = useRef<(node: number) => void>(() => {});
  useEffect(() => {
    forget.current = (node) => {
      if (localKey?.length) {
        setAdminAccess(node, false, base64Encode(localKey));
      }
    };
  }, [localKey, setAdminAccess]);

  useEffect(() => {
    if (!client) return;
    const created = new RemoteSettings(nodeNum, {
      sendAdmin: (variant, dest, timeoutMs) =>
        client.sendAdmin(variant, dest, timeoutMs),
      editSettings: (messages, dest, timeoutMs) =>
        editSettings(client.kmp, messages, dest, timeoutMs),
      onDisconnect: (cb) =>
        client.events.onConnectionState.subscribe((state) => {
          if (state.kind === "disconnected") cb();
        }),
      forgetNode: (node) => forget.current(node),
    });
    // What the node runs decides which sections and fields it gets.
    void created.load("metadata");
    setRemote(created);
    return () => {
      created.dispose();
      setRemote((current) => (current === created ? undefined : current));
    };
  }, [client, nodeNum]);

  const radio = useSignal(remote?.editor.deviceRadio ?? NO_RADIO);
  const modules = useSignal(remote?.editor.deviceModules ?? NO_MODULES);
  const metadata = useSignal(remote?.metadata ?? NO_METADATA);
  const device = useMemo(
    () => remoteDevice(local, radio, modules, metadata),
    [local, radio, modules, metadata],
  );
  const scope = useMemo<RemoteSettingsScope | undefined>(
    () => (remote ? { remote, device, local, name } : undefined),
    [remote, device, local, name],
  );

  if (!scope) return <Spinner size="lg" className="m-auto" />;
  return (
    <RemoteSettingsContext.Provider value={scope}>
      {children}
    </RemoteSettingsContext.Provider>
  );
}
