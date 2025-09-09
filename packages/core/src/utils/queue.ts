import { fromBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { SimpleEventDispatcher } from "ste-simple-events";
import type { PacketError, QueueItem } from "../types.ts";

export class Queue {
  private queue: QueueItem[] = [];
  private lock = false;
  private ackNotifier = new SimpleEventDispatcher<number>();
  private errorNotifier = new SimpleEventDispatcher<PacketError>();
  private timeout: number;

  constructor() {
    this.timeout = 60000;
  }

  public getState(): QueueItem[] {
    return this.queue;
  }

  public clear(): void {
    this.queue = [];
  }

  public push(item: Omit<QueueItem, "promise" | "sent" | "added">): void {
    const queueItem: QueueItem = {
      ...item,
      sent: false,
      added: new Date(),
      promise: new Promise<number>((resolve, reject) => {
        this.ackNotifier.subscribe((id) => {
          if (item.id === id) {
            this.remove(item.id);
            resolve(id);
          }
        });
        this.errorNotifier.subscribe((e) => {
          if (item.id === e.id) {
            this.remove(item.id);
            reject(e);
          }
        });
        setTimeout(() => {
          if (this.queue.findIndex((qi) => qi.id === item.id) !== -1) {
            this.remove(item.id);
            const decoded = fromBinary(Protobuf.Mesh.ToRadioSchema, item.data);

            if (
              decoded.payloadVariant.case === "heartbeat" ||
              decoded.payloadVariant.case === "wantConfigId"
            ) {
              // heartbeat and wantConfigId packets are not acknowledged by the device, assume success after timeout
              resolve(item.id);
              return;
            }

            console.warn(
              `Packet ${item.id} of type ${decoded.payloadVariant.case} timed out`,
            );

            reject({
              id: item.id,
              error: Protobuf.Mesh.Routing_Error.TIMEOUT,
            });
          }
        }, this.timeout);
      }),
    };
    this.queue.push(queueItem);
  }

  public remove(id: number): void {
    if (this.lock) {
      setTimeout(() => this.remove(id), 100);
      return;
    }
    this.queue = this.queue.filter((item) => item.id !== id);
  }

  public processAck(id: number): void {
    this.ackNotifier.dispatch(id);
  }

  public processError(e: PacketError): void {
    console.error(
      `Error received for packet ${e.id}: ${
        Protobuf.Mesh.Routing_Error[e.error]
      }`,
    );
    this.errorNotifier.dispatch(e);
  }

  public wait(id: number): Promise<number> {
    const queueItem = this.queue.find((qi) => qi.id === id);
    if (!queueItem) {
      throw new Error("Packet does not exist");
    }
    return queueItem.promise;
  }

  public async processQueue(
    outputStream: WritableStream<Uint8Array>,
  ): Promise<void> {
    if (this.lock) {
      return;
    }

    this.lock = true;
    const writer = outputStream.getWriter();

    try {
      while (this.queue.filter((p) => !p.sent).length > 0) {
        const item = this.queue.filter((p) => !p.sent)[0];
        if (item) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          try {
            await writer.write(item.data);
            item.sent = true;
          } catch (error) {
            if (
              error?.code === "ECONNRESET" ||
              error?.code === "ERR_INVALID_STATE"
            ) {
              writer.releaseLock();
              this.lock = false;
              throw error;
            }
            console.error(`Error sending packet ${item.id}`, error);
          }
        }
      }
    } finally {
      writer.releaseLock();
      this.lock = false;
    }
  }
}
