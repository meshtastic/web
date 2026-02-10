/**
 * Device Setup
 *
 * Handles MeshDevice initialization and event subscriptions.
 */
import logger from "@core/services/logger";
import { connectionRepo, deviceRepo } from "@data/repositories";
import type { ConnectionStatus } from "@data/repositories/ConnectionRepository";
import {
  createChannelHandler,
  subscribeToDevice,
} from "@data/subscriptionService";
import { MeshDevice, Types } from "@meshtastic/core";
import { randId } from "@shared/utils/randId";
import { useDeviceStore } from "@state/index";
import * as configSync from "./ConfigSyncService";
import type { PacketTransport } from "./transportFactory";

const HEARTBEAT_INTERVAL_MS = 3 * 60 * 1000;
const CONFIG_COMPLETE_STAGE1 = 69420;
const CONFIG_COMPLETE_STAGE2 = 69421;

/** Navigation intent emitted when device is ready */
export interface NavigationIntent {
  nodeNum: number;
  cached: boolean;
  timestamp: number;
}

/** Context passed through setup helpers */
export interface SetupContext {
  connectionId: number;
  deviceId: number;
  meshDevice: MeshDevice;
  device: ReturnType<ReturnType<typeof useDeviceStore.getState>["addDevice"]>;
  subscriptions: Array<() => void>;
  cancelled: boolean;
  myNodeNum?: number;
  usedCache: boolean;
  deviceUpserted: Promise<void>;
  resolveDeviceUpserted: () => void;
  heartbeat?: ReturnType<typeof setInterval>;
}

/** Callbacks for setup events */
export interface SetupCallbacks {
  onStatusChange: (
    status: ConnectionStatus,
    errorMsg?: string,
  ) => Promise<void>;
  onNavigationIntent: (intent: NavigationIntent) => void;
  onHeartbeatStarted: (heartbeat: ReturnType<typeof setInterval>) => void;
}

/**
 * Set up a MeshDevice with all subscriptions
 */
export async function setupMeshDevice(
  connectionId: number,
  transport: PacketTransport,
  callbacks: SetupCallbacks,
  skipConfig?: boolean,
): Promise<SetupContext> {
  // Use a simple random ID for the MeshDevice instance (not persisted)
  const meshDeviceId = randId();

  const { initializeDevice, setConnection } = useDeviceStore.getState();
  const device = initializeDevice();

  const meshDevice = new MeshDevice(transport, meshDeviceId);
  setConnection(meshDevice);

  // Build context for helpers
  let resolveDeviceUpserted: () => void;
  const deviceUpserted = new Promise<void>((r) => (resolveDeviceUpserted = r));

  const ctx: SetupContext = {
    connectionId,
    deviceId: meshDeviceId,
    meshDevice,
    device,
    subscriptions: [],
    cancelled: false,
    usedCache: false,
    deviceUpserted,
    resolveDeviceUpserted: resolveDeviceUpserted!,
  };

  subscribeToNodeInfo(ctx, callbacks);
  subscribeToUserPackets(ctx);
  subscribeToConfig(ctx);
  subscribeToChannels(ctx);
  subscribeToConfigComplete(ctx, callbacks);
  subscribeToDeviceStatus(ctx, callbacks);

  device.resetConfigProgress();
  await callbacks.onStatusChange("configuring");

  if (skipConfig) {
    logger.info("[deviceSetup] Skipping config (debug mode)");
    await callbacks.onStatusChange("connected");
    startHeartbeat(ctx, callbacks);
  } else {
    runConfigSync(ctx, callbacks);
  }

  return ctx;
}

/**
 * Subscribe to node info events
 */
function subscribeToNodeInfo(
  ctx: SetupContext,
  callbacks: SetupCallbacks,
): void {
  const { meshDevice, device, subscriptions } = ctx;

  const unsub = meshDevice.events.onMyNodeInfo.subscribe(async (nodeInfo) => {
    ctx.myNodeNum = nodeInfo.myNodeNum;
    device.setHardware(nodeInfo);
    logger.debug(`[deviceSetup] myNodeNum: ${nodeInfo.myNodeNum}`);

    // Upsert device and link connection
    await upsertDeviceRecord(ctx, nodeInfo.myNodeNum);
    ctx.resolveDeviceUpserted();

    // Subscribe to DB events now that we have nodeNum
    const dbUnsub = subscribeToDevice(
      nodeInfo.myNodeNum,
      nodeInfo.myNodeNum,
      meshDevice,
    );
    subscriptions.push(dbUnsub);

    await tryUseCachedConfig(ctx, callbacks, nodeInfo.myNodeNum);
  });

  subscriptions.push(unsub);
}

/**
 * Subscribe to user packets
 */
function subscribeToUserPackets(ctx: SetupContext): void {
  const unsub = ctx.meshDevice.events.onUserPacket.subscribe(async (packet) => {
    if (ctx.myNodeNum && packet.from === ctx.myNodeNum) {
      await deviceRepo
        .upsertDevice({
          nodeNum: packet.from,
          shortName: packet.data.shortName ?? undefined,
          longName: packet.data.longName ?? undefined,
          hwModel: packet.data.hwModel ?? undefined,
        })
        .catch((err) =>
          logger.warn("[deviceSetup] Failed to sync device info:", err),
        );
    }
  });

  ctx.subscriptions.push(unsub);
}

/**
 * Subscribe to config packets
 */
function subscribeToConfig(ctx: SetupContext): void {
  const { meshDevice, device, subscriptions } = ctx;

  const configUnsub = meshDevice.events.onConfigPacket.subscribe((config) => {
    logger.debug(`[deviceSetup] Config: ${config.payloadVariant.case}`);
    device.setConfig(config);
  });

  const moduleUnsub = meshDevice.events.onModuleConfigPacket.subscribe(
    (config) => {
      logger.debug(`[deviceSetup] ModuleConfig: ${config.payloadVariant.case}`);
      device.setModuleConfig(config);
    },
  );

  subscriptions.push(configUnsub, moduleUnsub);
}

/**
 * Subscribe to channel packets early to avoid race with async onMyNodeInfo.
 *
 * Channels arrive during the config flow (after config/moduleConfig, before
 * configComplete). The DB `channels` table has a FK on `devices.nodeNum`, so
 * we await `deviceUpserted` to guarantee the device record exists before
 * inserting. This subscription is set up synchronously — before any async
 * work — so no channel events are missed.
 */
function subscribeToChannels(ctx: SetupContext): void {
  const { meshDevice, subscriptions } = ctx;

  const unsub = meshDevice.events.onChannelPacket.subscribe(async (channel) => {
    try {
      await ctx.deviceUpserted;
      if (ctx.myNodeNum == null) return;
      await createChannelHandler(ctx.myNodeNum)(channel);
    } catch (error) {
      logger.error("[deviceSetup] Error saving channel:", error);
    }
  });

  subscriptions.push(unsub);
}

/**
 * Subscribe to config complete events
 */
function subscribeToConfigComplete(
  ctx: SetupContext,
  callbacks: SetupCallbacks,
): void {
  const { meshDevice, subscriptions } = ctx;

  const unsub = meshDevice.events.onConfigComplete.subscribe(async (nonce) => {
    logger.info(`[deviceSetup] Config complete (nonce: ${nonce})`);

    if (nonce === CONFIG_COMPLETE_STAGE1) {
      await handleConfigStage1Complete(ctx, callbacks);
    } else if (nonce === CONFIG_COMPLETE_STAGE2) {
      unsub();
      await callbacks.onStatusChange("configured");
      logger.debug("[deviceSetup] NodeDB sync complete");
    }
  });

  subscriptions.push(unsub);
}

/**
 * Subscribe to device status events
 */
function subscribeToDeviceStatus(
  ctx: SetupContext,
  _callbacks: SetupCallbacks,
): void {
  const { meshDevice, connectionId, subscriptions } = ctx;

  const unsub = meshDevice.events.onDeviceStatus.subscribe(async (status) => {
    if (status === Types.DeviceStatusEnum.DeviceDisconnected) {
      logger.debug(`[deviceSetup] Device disconnected (id: ${connectionId})`);
      await connectionRepo.updateStatus(connectionId, "disconnected");
      clearHeartbeat(ctx);
    }
  });

  subscriptions.push(unsub);
}

/**
 * Upsert device record and link connection
 */
async function upsertDeviceRecord(
  ctx: SetupContext,
  nodeNum: number,
): Promise<void> {
  try {
    await deviceRepo.upsertDevice({ nodeNum });
    await connectionRepo.updateConnection(ctx.connectionId, { nodeNum });
    logger.debug(
      `[deviceSetup] Linked connection ${ctx.connectionId} to device ${nodeNum}`,
    );
  } catch (err) {
    logger.warn("[deviceSetup] Failed to upsert device:", err);
  }
}

/**
 * Try to use cached config for fast reconnection
 */
async function tryUseCachedConfig(
  ctx: SetupContext,
  callbacks: SetupCallbacks,
  nodeNum: number,
): Promise<void> {
  const result = await configSync.tryLoadCachedConfig(nodeNum, {
    config: ctx.device.config,
    moduleConfig: ctx.device.moduleConfig,
    metadata: ctx.device.metadata,
    setCachedConfig: ctx.device.setCachedConfig,
  });

  if (result.usedCache) {
    ctx.usedCache = true;
    await callbacks.onStatusChange("connected");
    emitNavigationIntent(ctx, callbacks, nodeNum, true);
    startHeartbeat(ctx, callbacks);
  }
}

/**
 * Handle stage 1 config complete
 */
async function handleConfigStage1Complete(
  ctx: SetupContext,
  callbacks: SetupCallbacks,
): Promise<void> {
  const { device, myNodeNum } = ctx;
  const wasCached = device.isCachedConfig;

  device.setIsCachedConfig(false);

  if (!wasCached) {
    await callbacks.onStatusChange("connected");
  }

  // Save fresh config to cache and compute base hashes
  if (myNodeNum) {
    await configSync.saveFreshConfig(myNodeNum, {
      config: device.config,
      moduleConfig: device.moduleConfig,
      metadata: device.metadata,
      setCachedConfig: device.setCachedConfig,
    });
  }

  if (!wasCached && myNodeNum) {
    await ctx.deviceUpserted;
    emitNavigationIntent(ctx, callbacks, myNodeNum, false);
  }
}

/**
 * Run the two-stage config sync
 */
function runConfigSync(ctx: SetupContext, callbacks: SetupCallbacks): void {
  logger.debug("[deviceSetup] Starting configureTwoStage");

  ctx.meshDevice
    .configureTwoStage()
    .then(() => {
      logger.debug("[deviceSetup] configureTwoStage completed");
      if (!ctx.usedCache) {
        startHeartbeat(ctx, callbacks);
      }
    })
    .catch(async (err) => {
      if (ctx.usedCache) {
        logger.warn(
          `[deviceSetup] Config sync failed (using cache): ${err.message}`,
        );
      } else {
        logger.error(`[deviceSetup] configureTwoStage failed: ${err.message}`);
        await callbacks.onStatusChange("error", err.message);
      }
    });
}

/**
 * Start heartbeat interval
 */
function startHeartbeat(ctx: SetupContext, callbacks: SetupCallbacks): void {
  ctx.meshDevice
    .heartbeat()
    .then(() => {
      const heartbeat = setInterval(() => {
        ctx.meshDevice
          .heartbeat()
          .catch((e) => logger.warn("[Heartbeat] Failed:", e));
      }, HEARTBEAT_INTERVAL_MS);
      ctx.heartbeat = heartbeat;
      callbacks.onHeartbeatStarted(heartbeat);
    })
    .catch((e) => logger.warn("[Heartbeat] Initial heartbeat failed:", e));
}

/**
 * Clear heartbeat interval
 */
export function clearHeartbeat(ctx: SetupContext): void {
  if (ctx.heartbeat) {
    clearInterval(ctx.heartbeat);
    ctx.heartbeat = undefined;
  }
}

/**
 * Emit navigation intent
 */
function emitNavigationIntent(
  ctx: SetupContext,
  callbacks: SetupCallbacks,
  nodeNum: number,
  cached: boolean,
): void {
  if (ctx.cancelled) {
    logger.debug(`[deviceSetup] Skipping nav intent - cancelled`);
    return;
  }

  const intent: NavigationIntent = { nodeNum, cached, timestamp: Date.now() };
  callbacks.onNavigationIntent(intent);
}

/**
 * Clean up all subscriptions
 */
export function cleanupSubscriptions(ctx: SetupContext): void {
  clearHeartbeat(ctx);
  for (const unsub of ctx.subscriptions) {
    unsub();
  }
  ctx.subscriptions = [];
}

/**
 * Disconnect the MeshDevice and clear device store
 */
export function disconnectMeshDevice(): void {
  const { device, clearDevice } = useDeviceStore.getState();

  try {
    device?.connection?.disconnect();
  } catch (err) {
    logger.warn("[deviceSetup] Disconnect error:", err);
  }

  clearDevice();
}
