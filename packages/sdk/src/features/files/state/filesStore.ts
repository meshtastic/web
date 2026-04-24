import { SignalMap } from "../../../core/signals/createStore.ts";
import type { FileTransfer } from "../domain/FileTransfer.ts";

export class FilesStore extends SignalMap<number, FileTransfer> {}
