/**
 * Repository exports
 */

export { ChannelRepository } from "./ChannelRepository.ts";
export {
  ConfigCacheRepository,
  type CachedConfig,
  type ChangeType,
  type ConflictInfo,
} from "./ConfigCacheRepository.ts";
export { ConnectionRepository } from "./ConnectionRepository.ts";
export { MessageRepository } from "./MessageRepository.ts";
export { NodeRepository } from "./NodeRepository.ts";
export { PacketLogRepository } from "./PacketLogRepository.ts";
export { PreferencesRepository } from "./PreferencesRepository.ts";
export { TracerouteRepository } from "./TracerouteRepository.ts";

// Singleton instances for convenience
import { ChannelRepository } from "./ChannelRepository.ts";
import { ConfigCacheRepository } from "./ConfigCacheRepository.ts";
import { ConnectionRepository } from "./ConnectionRepository.ts";
import { MessageRepository } from "./MessageRepository.ts";
import { NodeRepository } from "./NodeRepository.ts";
import { PacketLogRepository } from "./PacketLogRepository.ts";
import { PreferencesRepository } from "./PreferencesRepository.ts";
import { TracerouteRepository } from "./TracerouteRepository.ts";

export const messageRepo = new MessageRepository();
export const nodeRepo = new NodeRepository();
export const channelRepo = new ChannelRepository();
export const configCacheRepo = new ConfigCacheRepository();
export const connectionRepo = new ConnectionRepository();
export const packetLogRepo = new PacketLogRepository();
export const preferencesRepo = new PreferencesRepository();
export const tracerouteRepo = new TracerouteRepository();
