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
 * A stage fails if the device goes this long without sending a handshake
 * frame. Each handshake frame re-arms the timer, so a large NodeDB never
 * trips it while it streams; live mesh traffic does not, so a lost frame
 * can't keep a stalled handshake alive. A stall fails the handshake rather
 * than resending `want_config_id` in the same session, which the Android
 * client found can wedge firmware; callers recover by reopening the
 * transport.
 */
export const HANDSHAKE_IDLE_TIMEOUT_MS = 15_000;

/** Hard cap on one stage, however long frames keep arriving (as Android). */
export const HANDSHAKE_STAGE_MAX_MS = 10 * HANDSHAKE_IDLE_TIMEOUT_MS;

/** FromRadio variants that count as handshake progress. */
export const HANDSHAKE_FRAME_CASES: ReadonlySet<string> = new Set([
  "myInfo",
  "nodeInfo",
  "config",
  "moduleConfig",
  "channel",
  "metadata",
  "fileInfo",
  "deviceuiConfig",
  "regionPresets",
  "configCompleteId",
]);

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
