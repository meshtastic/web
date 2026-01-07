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
export { ConfigHashRepository } from "./ConfigHashRepository.ts";
export { WorkingHashRepository } from "./WorkingHashRepository.ts";
export { ConnectionRepository } from "./ConnectionRepository.ts";
export { DeviceRepository } from "./DeviceRepository.ts";
export { MessageRepository } from "./MessageRepository.ts";
export { NodeRepository } from "./NodeRepository.ts";
export { PacketLogRepository } from "./PacketLogRepository.ts";
export { PreferencesRepository } from "./PreferencesRepository.ts";
export { ReactionRepository } from "./ReactionRepository.ts";
export { TracerouteRepository } from "./TracerouteRepository.ts";

// Singleton instances for convenience
import { ChannelRepository } from "./ChannelRepository.ts";
import { ConfigCacheRepository } from "./ConfigCacheRepository.ts";
import { ConfigHashRepository } from "./ConfigHashRepository.ts";
import { WorkingHashRepository } from "./WorkingHashRepository.ts";
import { ConnectionRepository } from "./ConnectionRepository.ts";
import { DeviceRepository } from "./DeviceRepository.ts";
import { MessageRepository } from "./MessageRepository.ts";
import { NodeRepository } from "./NodeRepository.ts";
import { PacketLogRepository } from "./PacketLogRepository.ts";
import { PreferencesRepository } from "./PreferencesRepository.ts";
import { ReactionRepository } from "./ReactionRepository.ts";
import { TracerouteRepository } from "./TracerouteRepository.ts";

export const channelRepo = new ChannelRepository();
export const configCacheRepo = new ConfigCacheRepository();
export const configHashRepo = new ConfigHashRepository();
export const workingHashRepo = new WorkingHashRepository();
export const connectionRepo = new ConnectionRepository();
export const deviceRepo = new DeviceRepository();
export const messageRepo = new MessageRepository();
export const nodeRepo = new NodeRepository();
export const packetLogRepo = new PacketLogRepository();
export const preferencesRepo = new PreferencesRepository();
export const reactionRepo = new ReactionRepository();
export const tracerouteRepo = new TracerouteRepository();
