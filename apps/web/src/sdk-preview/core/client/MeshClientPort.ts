import type { Protobuf, Types } from "@meshtastic/core";

/**
 * Minimal subscribe-only view of an event source. `ste-simple-events`'
 * `SimpleEventDispatcher` (used by the legacy `MeshDevice`) satisfies this, as
 * does a preact signal facade — so the slice doesn't care where events come
 * from.
 */
export interface Subscribable<T> {
  subscribe(listener: (value: T) => void): unknown;
}

/** The subset of device events the config slice subscribes to. */
export interface MeshClientEvents {
  onConfigPacket: Subscribable<Protobuf.Config.Config>;
  onModuleConfigPacket: Subscribable<Protobuf.ModuleConfig.ModuleConfig>;
  onDeviceStatus: Subscribable<Types.DeviceStatusEnum>;
}

/**
 * The port the config slice talks to.
 *
 * In the real SDK this is the full `MeshClient`; here it is the minimal surface
 * `ConfigEditor` needs, so the slice stays decoupled and unit-testable with a
 * fake. `adapters/fromMeshDevice.ts` builds one of these from the existing
 * `@meshtastic/core` `MeshDevice`.
 */
export interface MeshClientPort {
  readonly events: MeshClientEvents;
  setConfig(config: Protobuf.Config.Config): Promise<number>;
  setModuleConfig(
    moduleConfig: Protobuf.ModuleConfig.ModuleConfig,
  ): Promise<number>;
  beginEditSettings(): Promise<number>;
  commitEditSettings(): Promise<number>;
}
