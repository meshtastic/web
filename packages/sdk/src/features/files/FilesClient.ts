import { Result } from "better-result";
import type { ResultType } from "better-result";
import type { MeshClient } from "../../core/client/MeshClient.ts";
import { generatePacketId } from "../../core/identifiers/PacketId.ts";
import type { ReadonlySignal } from "../../core/signals/createStore.ts";
import type { FileTransfer } from "./domain/FileTransfer.ts";
import { FilesStore } from "./state/filesStore.ts";

export class FilesClient {
  private readonly client: MeshClient;
  private readonly store: FilesStore;
  public readonly transfers: ReadonlySignal<ReadonlyArray<FileTransfer>>;

  constructor(client: MeshClient) {
    this.client = client;
    this.store = new FilesStore();
    this.transfers = this.store.read;
  }

  public async upload(
    filename: string,
    data: Uint8Array,
  ): Promise<ResultType<FileTransfer, Error>> {
    const id = generatePacketId();
    const transfer: FileTransfer = {
      id,
      filename,
      direction: "upload",
      status: "in_progress",
      size: data.length,
    };
    this.store.set(id, transfer);
    try {
      await this.client.xModem.uploadFile(filename, data);
      const done: FileTransfer = { ...transfer, status: "complete" };
      this.store.set(id, done);
      return Result.ok(done);
    } catch (e) {
      const failed: FileTransfer = { ...transfer, status: "failed" };
      this.store.set(id, failed);
      return Result.err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  public async download(filename: string): Promise<ResultType<FileTransfer, Error>> {
    const id = generatePacketId();
    const transfer: FileTransfer = {
      id,
      filename,
      direction: "download",
      status: "in_progress",
    };
    this.store.set(id, transfer);
    try {
      await this.client.xModem.downloadFile(filename);
      const done: FileTransfer = { ...transfer, status: "complete" };
      this.store.set(id, done);
      return Result.ok(done);
    } catch (e) {
      const failed: FileTransfer = { ...transfer, status: "failed" };
      this.store.set(id, failed);
      return Result.err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
