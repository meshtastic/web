import type * as Protobuf from "@meshtastic/protobufs";

export interface Node {
  readonly num: number;
  readonly user?: Protobuf.Mesh.User;
  readonly position?: Protobuf.Mesh.Position;
  readonly deviceMetrics?: Protobuf.Telemetry.DeviceMetrics;
  readonly lastHeard?: number;
  readonly snr?: number;
  readonly channel?: number;
  readonly viaMqtt?: boolean;
  readonly hopsAway?: number;
  readonly isFavorite: boolean;
  readonly isIgnored: boolean;
  readonly isKeyManuallyVerified?: boolean;
  readonly isMuted?: boolean;
  /** The node signs its packets with XEdDSA (firmware 2.8+). */
  readonly hasXeddsaSigned?: boolean;
  /**
   * Heard over LoRa since the radio's current LoRa settings took effect.
   * Firmware older than 2.8.1 doesn't report it, so every node counts as
   * heard there. See {@link isUnheardOnCurrentLora}.
   */
  readonly heardOnCurrentLora?: boolean;
  /** Latest status message the node broadcast (NODE_STATUS_APP). */
  readonly status?: string;
}

/**
 * True for a node the radio hasn't heard on its current LoRa settings.
 * Nodes seen only over MQTT are never "unheard": LoRa settings don't apply.
 */
export const isUnheardOnCurrentLora = (node: Node): boolean =>
  node.heardOnCurrentLora === false && !node.viaMqtt;
