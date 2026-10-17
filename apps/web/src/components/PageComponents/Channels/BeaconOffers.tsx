import { Button } from "@components/UI/Button.tsx";
import {
  type JoinableBeaconOffer,
  useBeaconOffers,
} from "@core/hooks/useBeaconOffers.ts";
import { type Node, Protobuf } from "@meshtastic/sdk";
import { useNodes } from "@meshtastic/sdk-react";
import { RadioTowerIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

const formatEnum = (name: string) =>
  name
    .toLowerCase()
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");

/** The sender's long name, or its node ID. */
export function beaconSenderName(
  nodes: ReadonlyArray<Node>,
  from: number,
): string {
  const node = nodes.find((n) => n.num === from);
  return node?.user?.longName || `!${from.toString(16).padStart(8, "0")}`;
}

/** Channel, preset and region an offer advertises, and what joining does. */
export function BeaconOfferDetails({ entry }: { entry: JoinableBeaconOffer }) {
  const { t } = useTranslation("channels");
  const { beacon } = entry.offer;
  const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;
  const preset =
    beacon.offerPreset !== undefined
      ? Protobuf.Config.Config_LoRaConfig_ModemPreset[beacon.offerPreset]
      : undefined;
  const parts = [
    beacon.offerChannel?.name || t("beaconOffers.defaultChannel"),
    preset ? formatEnum(preset) : undefined,
    beacon.offerRegion !== Region.UNSET
      ? Region[beacon.offerRegion]
      : undefined,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-1 text-sm">
      {beacon.message && <p className="italic">“{beacon.message}”</p>}
      <p>{parts.join(" · ")}</p>
      <p className="font-medium">
        {entry.plan.option === "switch"
          ? t("beaconOffers.switchHint")
          : t("beaconOffers.addHint")}
      </p>
    </div>
  );
}

function BeaconOfferRow({
  entry,
  onJoin,
  onDismiss,
}: {
  entry: JoinableBeaconOffer;
  onJoin: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation("channels");
  const sender = beaconSenderName(useNodes(), entry.offer.from);
  return (
    <li className="flex flex-col gap-2 rounded-md border border-slate-300 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-600">
      <div className="flex flex-col gap-1">
        <p className="font-semibold">{t("beaconOffers.from", { sender })}</p>
        <BeaconOfferDetails entry={entry} />
      </div>
      <div className="flex shrink-0 gap-2">
        <Button type="button" size="sm" onClick={onJoin}>
          {entry.plan.option === "switch"
            ? t("beaconOffers.switch")
            : t("beaconOffers.join")}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDismiss}>
          {t("beaconOffers.dismiss")}
        </Button>
      </div>
    </li>
  );
}

/** Joinable Mesh Beacon offers, shown above the channel tabs. */
export const BeaconOffers = () => {
  const { t } = useTranslation("channels");
  const { offers, join, dismiss } = useBeaconOffers();
  if (offers.length === 0) return null;

  return (
    <section className="mb-4 flex flex-col gap-2 max-md:px-2">
      <h3 className="flex items-center gap-2 font-medium">
        <RadioTowerIcon size={16} />
        {t("beaconOffers.title")}
      </h3>
      <ul className="flex flex-col gap-2">
        {offers.map((entry) => (
          <BeaconOfferRow
            key={entry.key}
            entry={entry}
            onJoin={() => join(entry)}
            onDismiss={() => dismiss(entry)}
          />
        ))}
      </ul>
    </section>
  );
};
