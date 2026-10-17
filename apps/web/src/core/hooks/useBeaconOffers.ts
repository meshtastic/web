import { useBeaconJoinStore } from "@core/stores/beaconJoinStore.ts";
import { useDevice } from "@core/stores";
import {
  type BeaconJoinPlan,
  beaconOfferKey,
  channelSettingsByIndex,
  planBeaconJoin,
} from "@core/utils/beaconJoin.ts";
import type { MeshBeaconOffer } from "@meshtastic/sdk";
import { useActiveClient, useChannels, useSignal } from "@meshtastic/sdk-react";
import { useCallback, useMemo } from "react";

export interface JoinableBeaconOffer {
  readonly key: string;
  readonly offer: MeshBeaconOffer;
  readonly plan: BeaconJoinPlan;
}

const NO_OFFERS: ReadonlyArray<MeshBeaconOffer> = [];
const EMPTY_OFFERS_SIGNAL = {
  value: NO_OFFERS,
  peek: () => NO_OFFERS,
  subscribe: () => () => {},
};

/**
 * Mesh Beacon offers the radio could join, newest first: offers the user
 * dismissed this session and offers for a channel the radio already has
 * (under the committed LoRa config and channel table) are left out.
 */
export function useBeaconOffers() {
  const client = useActiveClient();
  const offers = useSignal(
    client?.channels.beaconOffers ?? EMPTY_OFFERS_SIGNAL,
  );
  const channels = useChannels();
  const { config } = useDevice();
  const dismissed = useBeaconJoinStore((s) => s.dismissed);
  const markDismissed = useBeaconJoinStore((s) => s.markDismissed);
  const startJoin = useBeaconJoinStore((s) => s.startJoin);

  const joinable = useMemo(() => {
    const byIndex = channelSettingsByIndex(channels);
    const result: JoinableBeaconOffer[] = [];
    for (const offer of offers) {
      const key = beaconOfferKey(offer);
      if (dismissed.has(key)) continue;
      const plan = planBeaconJoin(offer, config.lora, byIndex);
      if (plan) result.push({ key, offer, plan });
    }
    return result;
  }, [offers, channels, config.lora, dismissed]);

  const dismiss = useCallback(
    (entry: JoinableBeaconOffer) => {
      markDismissed(entry.key);
      client?.channels.dismissBeaconOffer(entry.offer.from);
    },
    [client, markDismissed],
  );

  /** Open the channel import dialog with the offer filled in. */
  const join = useCallback(
    (entry: JoinableBeaconOffer) => startJoin(entry.plan),
    [startJoin],
  );

  return { offers: joinable, join, dismiss };
}
