import type { ChannelNumber, PacketDestination } from "../../../core/types.ts";
import type { MessageState } from "./MessageState.ts";

/**
 * A text message sent or received on the mesh.
 */
export interface Message {
  readonly id: number;
  readonly from: number;
  readonly to: number;
  readonly channel: ChannelNumber;
  readonly rxTime: Date;
  readonly type: PacketDestination;
  readonly text: string;
  readonly state: MessageState;
}
