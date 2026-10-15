import {
  BeaconOfferDetails,
  beaconSenderName,
} from "@components/PageComponents/Channels/BeaconOffers.tsx";
import { Button } from "@components/UI/Button.tsx";
import { useBeaconOffers } from "@core/hooks/useBeaconOffers.ts";
import { useToast } from "@core/hooks/useToast.ts";
import { useBeaconJoinStore } from "@core/stores/beaconJoinStore.ts";
import { useNodes } from "@meshtastic/sdk-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

const TOAST_DURATION_MS = 30_000;

/**
 * Toasts each new joinable Mesh Beacon offer once per session. Only one
 * toast shows at a time, so it waits while another is open rather than
 * replacing it (the region and key backup reminders use toasts too). The
 * Channels page keeps the full list.
 */
export const BeaconOfferNotifier = (): null => {
  const { offers, join, dismiss } = useBeaconOffers();
  const notified = useBeaconJoinStore((s) => s.notified);
  const markNotified = useBeaconJoinStore((s) => s.markNotified);
  const { toast, toasts } = useToast();
  const { t } = useTranslation("channels");
  const nodes = useNodes();
  // toast() adds the toast on a timer, so remember ours until it shows.
  const queuedToastId = useRef<string | undefined>(undefined);

  const next = offers.find((entry) => !notified.has(entry.key));

  useEffect(() => {
    if (toasts.some((item) => item.id === queuedToastId.current)) {
      queuedToastId.current = undefined;
    }
    const busy =
      queuedToastId.current !== undefined ||
      toasts.some((item) => item.open !== false);
    if (!next || busy) return;
    markNotified(next.key);
    const { id, dismiss: close } = toast({
      // Toasts render outside the device tree, so pass plain content.
      title: t("beaconOffers.from", {
        sender: beaconSenderName(nodes, next.offer.from),
      }),
      description: <BeaconOfferDetails entry={next} />,
      duration: TOAST_DURATION_MS,
      action: (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              close();
              join(next);
            }}
          >
            {next.plan.option === "switch"
              ? t("beaconOffers.switch")
              : t("beaconOffers.join")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              close();
              dismiss(next);
            }}
          >
            {t("beaconOffers.dismiss")}
          </Button>
        </div>
      ),
    });
    queuedToastId.current = id;
  }, [next, toasts, markNotified, toast, join, dismiss, t, nodes]);

  return null;
};
