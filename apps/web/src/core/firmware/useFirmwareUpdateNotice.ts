import { useLocalNodeAsProto } from "@core/hooks/useNodesAsProto.ts";
import { useActiveClient, useSignal } from "@core/kmp/hooks";
import { constantSignal } from "@core/kmp/signals.ts";
import { Protobuf } from "@core/protobuf.ts";
import { firmwareFlasherUrl } from "@core/settings/registry.ts";
import { formatNodeId } from "@core/utils/nodeIdentity.ts";
import { Result } from "better-result";
import { useEffect, useMemo, useState } from "react";
import type { FirmwareUpdateNotice } from "./updateCheck.ts";
import {
  checkFirmwareUpdate,
  type FirmwareUpdateSources,
  firmwareUpdateSources,
  type LocalRadio,
  RELEASES_MAX_AGE_MS,
} from "./updateSources.ts";

const NOT_CONFIGURED = constantSignal(false);
const NO_VALUE = constantSignal(undefined);

/** The connected local radio, from the session itself so remote admin never stands in for it. */
export function useLocalRadio(): LocalRadio | undefined {
  const client = useActiveClient();
  const configured = useSignal(client?.device.isConfigured ?? NOT_CONFIGURED);
  const myNodeNum = useSignal(client?.device.myNodeNum ?? NO_VALUE);
  const metadata = useSignal(client?.device.metadata ?? NO_VALUE);
  const myNodeInfo = useSignal(client?.device.myNodeInfo ?? NO_VALUE);
  const nodeHwModel = useLocalNodeAsProto()?.user?.hwModel;

  const firmwareVersion = metadata?.firmwareVersion || undefined;
  const rawHwModel = metadata?.hwModel || nodeHwModel;
  const hwModel =
    rawHwModel === undefined || rawHwModel === Protobuf.Mesh.HardwareModel.UNSET
      ? undefined
      : rawHwModel;
  const pioEnv = myNodeInfo?.pioEnv || undefined;

  return useMemo(
    () =>
      configured && myNodeNum !== undefined
        ? {
            nodeIdentity: formatNodeId(myNodeNum),
            firmwareVersion,
            hwModel,
            pioEnv,
          }
        : undefined,
    [configured, myNodeNum, firmwareVersion, hwModel, pioEnv],
  );
}

export interface FirmwareUpdateNudge {
  readonly notice: FirmwareUpdateNotice;
  /** Meshtastic Flasher, with this radio's hardware preselected when known. */
  readonly flasherUrl: string;
}

const radioKey = (radio: LocalRadio): string =>
  [radio.nodeIdentity, radio.firmwareVersion, radio.hwModel, radio.pioEnv].join(
    "|",
  );

/**
 * The stable firmware-update nudge for the connected radio, or undefined.
 * Checked on connect, whenever the radio's version or hardware changes,
 * and again each hour while connected. A failed check shows nothing and
 * never affects the connection.
 */
export function useFirmwareUpdateNotice(
  sources: FirmwareUpdateSources = firmwareUpdateSources,
  refreshMs: number = RELEASES_MAX_AGE_MS,
): FirmwareUpdateNudge | undefined {
  const radio = useLocalRadio();
  const key = radio ? radioKey(radio) : undefined;
  const [result, setResult] = useState<
    { key: string; nudge: FirmwareUpdateNudge | undefined } | undefined
  >(undefined);

  useEffect(() => {
    if (!radio || key === undefined) return;
    let cancelled = false;
    const check = () => {
      void checkFirmwareUpdate(radio, sources).then((outcome) => {
        if (cancelled) return;
        const notice = Result.isOk(outcome) ? outcome.value : undefined;
        setResult({
          key,
          nudge: notice
            ? { notice, flasherUrl: firmwareFlasherUrl(radio.hwModel) }
            : undefined,
        });
      });
    };
    check();
    const timer = setInterval(check, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [radio, key, sources, refreshMs]);

  // A result for another radio, or none connected, is never shown.
  return result && result.key === key ? result.nudge : undefined;
}
