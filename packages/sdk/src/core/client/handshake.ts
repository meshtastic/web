/**
 * PhoneAPI handshake constants, shared with the Android client and the
 * Kotlin SDK.
 *
 * The handshake runs in two stages. Stage one asks for config only (my_info,
 * metadata, region presets, config, module config, channels); stage two asks
 * for the NodeDB only. Firmware treats these two `want_config_id` values
 * specially, so they must not be replaced by random ids.
 */
export const CONFIG_NONCE = 69420;
export const NODEDB_NONCE = 69421;

/** Pause on each side of the heartbeat sent between the two stages. */
export const HANDSHAKE_SETTLE_MS = 100;

/**
 * A stage fails if the device goes this long without sending a frame. Each
 * frame re-arms the timer, so a large NodeDB never trips it while it streams.
 * The first stall resends the stage's `want_config_id` once.
 */
export const HANDSHAKE_IDLE_TIMEOUT_MS = 15_000;

export const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Heartbeat nonces start at 2 and count up. Firmware 2.7.23+ treats nonce 1
 * as a request to broadcast this node's NodeInfo across the mesh, and drops
 * a ToRadio write identical to the previous one, so a fixed nonce of 0 is
 * not a reliable keep-alive either.
 */
export const FIRST_HEARTBEAT_NONCE = 2;

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
