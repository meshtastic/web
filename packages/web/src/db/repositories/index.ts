/**
 * Repository exports
 */

export { ChannelRepository } from "./ChannelRepository.ts";
export { ConnectionRepository } from "./ConnectionRepository.ts";
export { MessageRepository } from "./MessageRepository.ts";
export { NodeRepository } from "./NodeRepository.ts";
export { PreferencesRepository } from "./PreferencesRepository.ts";

// Singleton instances for convenience
import { ChannelRepository } from "./ChannelRepository.ts";
import { ConnectionRepository } from "./ConnectionRepository.ts";
import { MessageRepository } from "./MessageRepository.ts";
import { NodeRepository } from "./NodeRepository.ts";
import { PreferencesRepository } from "./PreferencesRepository.ts";

export const messageRepo = new MessageRepository();
export const nodeRepo = new NodeRepository();
export const channelRepo = new ChannelRepository();
export const connectionRepo = new ConnectionRepository();
export const preferencesRepo = new PreferencesRepository();
