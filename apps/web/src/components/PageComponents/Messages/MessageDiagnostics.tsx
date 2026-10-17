import { IndicatorIcon } from "@components/generic/NodeTrustIndicators.tsx";
import type { Message } from "@core/stores/messageStore";
import { cn } from "@core/utils/cn.ts";
import {
  type LoRaSignalSettings,
  rssiQuality,
  type SignalQuality,
  snrQuality,
} from "@core/utils/signalQuality.ts";
import { Protobuf } from "@meshtastic/sdk";
import type { LucideIcon } from "lucide-react";
import { Cable, Cloud, Network, Route, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

const Transport = Protobuf.Mesh.MeshPacket_TransportMechanism;

const QUALITY_CLASS: Record<SignalQuality, string> = {
  good: "text-green-600 dark:text-green-500",
  fair: "text-yellow-600 dark:text-yellow-400",
  bad: "text-orange-600 dark:text-orange-400",
  none: "text-red-600 dark:text-red-400",
};

const MUTED = "text-slate-500 dark:text-slate-400";

/**
 * The transports worth calling out. LoRa and unicast UDP are the normal case
 * and get no icon, as in the Android app. TRANSPORT_INTERNAL is skipped too:
 * it is the proto default, so firmware that doesn't set the field would mark
 * every message with it.
 */
function transportBadge(
  transport: Message["transport"],
  viaMqtt: boolean,
): { icon: LucideIcon; key: "mqtt" | "udp" | "api" } | undefined {
  if (viaMqtt || transport === Transport.TRANSPORT_MQTT) {
    return { icon: Cloud, key: "mqtt" };
  }
  if (transport === Transport.TRANSPORT_MULTICAST_UDP) {
    return { icon: Network, key: "udp" };
  }
  if (transport === Transport.TRANSPORT_API) {
    return { icon: Cable, key: "api" };
  }
  return undefined;
}

interface MessageDiagnosticsProps {
  message: Message;
  lora?: LoRaSignalSettings;
}

/**
 * How a received message reached us, after the Android app's DiagnosticsRow:
 * the signature check, a transport badge, then SNR and RSSI when it came
 * straight from the sender over LoRa, or the hop count when it was relayed.
 */
export const MessageDiagnostics = ({
  message,
  lora,
}: MessageDiagnosticsProps) => {
  const { t } = useTranslation("messages");
  const viaMqtt = message.viaMqtt === true;
  const transport = transportBadge(message.transport, viaMqtt);
  const direct = message.hopsAway === 0 && !viaMqtt;
  const hopsText =
    message.hopsAway === undefined
      ? t("diagnostics.hops.unknown")
      : t("diagnostics.hops.value", { count: message.hopsAway });

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {message.signed && (
        <IndicatorIcon
          icon={ShieldCheck}
          size={14}
          label={t("signature.signed.label")}
          tooltip={t("signature.signed.tooltip")}
          className="text-green-600 dark:text-green-500"
        />
      )}
      {transport && (
        <IndicatorIcon
          icon={transport.icon}
          size={14}
          label={t(`diagnostics.transport.${transport.key}.label`)}
          tooltip={t(`diagnostics.transport.${transport.key}.tooltip`)}
          className={MUTED}
        />
      )}
      {direct ? (
        <>
          {message.snr !== undefined && (
            <span
              className={QUALITY_CLASS[snrQuality(message.snr, lora)]}
              title={t("diagnostics.snr.tooltip")}
            >
              {t("diagnostics.snr.value", { value: message.snr.toFixed(2) })}
            </span>
          )}
          {message.rssi !== undefined && (
            <span
              className={QUALITY_CLASS[rssiQuality(message.rssi)]}
              title={t("diagnostics.rssi.tooltip")}
            >
              {t("diagnostics.rssi.value", { value: message.rssi })}
            </span>
          )}
        </>
      ) : (
        <span
          className={cn("inline-flex items-center gap-0.5", MUTED)}
          title={hopsText}
        >
          <Route size={14} aria-hidden="true" />
          <span aria-hidden="true">{message.hopsAway ?? "?"}</span>
          <span className="sr-only">{hopsText}</span>
        </span>
      )}
    </div>
  );
};
