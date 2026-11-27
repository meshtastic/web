import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { base64Decode, base64Encode } from "@bufbuild/protobuf/wire";

type ChannelSet = Protobuf.AppOnly.ChannelSet;

const CHANNEL_HOSTS = new Set(["meshtastic.org", "www.meshtastic.org"]);

/**
 * A channel share URL: the ChannelSet binary, base64url without padding, in
 * the fragment of https://meshtastic.org/e/. An `add` link asks the
 * importer to add the channels rather than replace the channel table, and
 * carries no LoRa settings, so importing it can't retune the radio.
 */
export function channelSetToUrl(
  channelSet: ChannelSet,
  { add = false }: { add?: boolean } = {},
): string {
  const payload = add
    ? create(Protobuf.AppOnly.ChannelSetSchema, {
        settings: channelSet.settings,
      })
    : channelSet;
  const base64 = base64Encode(
    toBinary(Protobuf.AppOnly.ChannelSetSchema, payload),
  )
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `https://meshtastic.org/e/${add ? "?add=true" : ""}#${base64}`;
}

export interface ChannelLink {
  /** The link's channels; an add link's LoRa settings are dropped. */
  readonly channelSet: ChannelSet;
  /** The link asks to add its channels, never to replace. */
  readonly add: boolean;
}

/**
 * `add` in a fragment's `?key=value` list: older clients put it after the
 * payload. A bare `add` counts as true; undefined when it isn't there.
 */
function fragmentAdd(params: string): boolean | undefined {
  const entry = params
    .split("&")
    .find((p) => p.split("=")[0]?.toLowerCase() === "add");
  if (entry === undefined) return undefined;
  const eq = entry.indexOf("=");
  return eq === -1 || entry.substring(eq + 1).toLowerCase() === "true";
}

/** `add` in the query: anything but `false` or `0` counts. */
function queryAdd(url: URL): boolean {
  const value = url.searchParams.get("add");
  if (value === null) return false;
  const flag = value.toLowerCase();
  return flag !== "false" && flag !== "0";
}

/**
 * The channels in a channel share URL. Accepts meshtastic.org and
 * www.meshtastic.org with an `e` path segment (`/e/`, `/e`, the legacy
 * `/channel/e/`), case-insensitively, and the add flag in the query or,
 * as older clients wrote it, in the fragment. Throws if it isn't one.
 */
export function parseChannelUrl(url: string): ChannelLink {
  const channelsUrl = new URL(url);
  // URL.hash keeps percent-encoding (`%3D` padding, say); the fragment
  // Android reads is decoded.
  let fragment: string;
  try {
    fragment = decodeURIComponent(channelsUrl.hash.substring(1));
  } catch {
    throw new Error("Malformed escape in channel URL");
  }
  const isChannelPath = channelsUrl.pathname
    .split("/")
    .some((segment) => segment.toLowerCase() === "e");
  if (
    !CHANNEL_HOSTS.has(channelsUrl.hostname.toLowerCase()) ||
    !isChannelPath ||
    fragment.trim() === ""
  ) {
    throw new Error("Not a channel URL");
  }

  const query = fragment.indexOf("?");
  const encoded = query === -1 ? fragment : fragment.substring(0, query);
  if (!/^[A-Za-z0-9+/_-]+=*$/.test(encoded)) {
    throw new Error("Invalid Base64 in channel URL");
  }
  const standard = encoded
    .replace(/=+$/, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const channelSet = fromBinary(
    Protobuf.AppOnly.ChannelSetSchema,
    base64Decode(
      standard.padEnd(standard.length + ((4 - (standard.length % 4)) % 4), "="),
    ),
  );

  const add =
    (query === -1 ? undefined : fragmentAdd(fragment.substring(query + 1))) ??
    queryAdd(channelsUrl);
  if (add) channelSet.loraConfig = undefined;
  return { channelSet, add };
}

/** The ChannelSet in a channel share URL. Throws if it isn't one. */
export function channelSetFromUrl(url: string): ChannelSet {
  return parseChannelUrl(url).channelSet;
}
