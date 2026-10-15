import { fromBinary, toBinary } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { fromByteArray, toByteArray } from "base64-js";

/**
 * A channel share URL: the ChannelSet binary, base64url without padding, in
 * the fragment of https://meshtastic.org/e/. `add` asks the importer to add
 * the channels rather than replace the channel table.
 */
export function channelSetToUrl(
  channelSet: Protobuf.AppOnly.ChannelSet,
  { add = false }: { add?: boolean } = {},
): string {
  const base64 = fromByteArray(
    toBinary(Protobuf.AppOnly.ChannelSetSchema, channelSet),
  )
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `https://meshtastic.org/e/${add ? "?add=true" : ""}#${base64}`;
}

/** The ChannelSet in a channel share URL. Throws if it isn't one. */
export function channelSetFromUrl(url: string): Protobuf.AppOnly.ChannelSet {
  const channelsUrl = new URL(url);
  if (
    (channelsUrl.hostname !== "meshtastic.org" &&
      channelsUrl.pathname !== "/e/") ||
    !channelsUrl.hash
  ) {
    throw new Error("Not a channel URL");
  }

  // The fragment follows a `#` that isn't URL encoded.
  const encoded = channelsUrl.hash.substring(1);
  const padded = encoded
    .padEnd(encoded.length + ((4 - (encoded.length % 4)) % 4), "=")
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  return fromBinary(Protobuf.AppOnly.ChannelSetSchema, toByteArray(padded));
}
