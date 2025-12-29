/**
 * TanStack Router Context Types
 *
 * Defines the context type passed to all routes via RouterProvider.
 * Enables dependency injection for easier testing and mocking.
 */

import type { Logger } from "tslog";
import type { dbClient } from "@data/client";
import type {
  ChannelRepository,
  ConfigCacheRepository,
  ConnectionRepository,
  MessageRepository,
  NodeRepository,
  PacketLogRepository,
  PreferencesRepository,
  TracerouteRepository,
} from "@data/repositories";
import type { useDeviceStore } from "@state/device";
import type { useUIStore } from "@state/ui";

export interface RouterContext {
  services: {
    db: typeof dbClient;
    logger: Logger<unknown>;
  };
  repositories: {
    channel: ChannelRepository;
    configCache: ConfigCacheRepository;
    connection: ConnectionRepository;
    message: MessageRepository;
    node: NodeRepository;
    packetLog: PacketLogRepository;
    preferences: PreferencesRepository;
    traceroute: TracerouteRepository;
  };
  stores: {
    device: typeof useDeviceStore;
    ui: typeof useUIStore;
  };
}
