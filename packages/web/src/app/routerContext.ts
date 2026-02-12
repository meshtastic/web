import type { dbClient } from "@data/client";
import type {
  ChannelRepository,
  ConnectionRepository,
  DeviceRepository,
  MessageRepository,
  NodeRepository,
  PacketLogRepository,
  PendingChangesRepository,
  PreferencesRepository,
  TracerouteRepository,
} from "@data/repositories";
import type { useDeviceStore } from "@state/device";
import type { useUIStore } from "@state/ui";
import type { Logger } from "tslog";

export interface RouterContext {
  services: {
    db: typeof dbClient;
    logger: Logger<unknown>;
  };
  repositories: {
    channel: ChannelRepository;
    pendingChanges: PendingChangesRepository;
    connection: ConnectionRepository;
    device: DeviceRepository;
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
