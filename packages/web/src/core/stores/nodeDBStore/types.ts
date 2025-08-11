type NodeError = {
  node: number;
  error: string;
};

type ProcessPacketParams = {
  from: number;
  snr: number;
  time: number;
};

export type { NodeError, ProcessPacketParams };
