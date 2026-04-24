export type TransferStatus = "pending" | "in_progress" | "complete" | "failed";

export interface FileTransfer {
  readonly id: number;
  readonly filename: string;
  readonly direction: "upload" | "download";
  readonly status: TransferStatus;
  readonly size?: number;
}
