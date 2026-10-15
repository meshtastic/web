export class MeshError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "MeshError";
  }
}

export class TransportClosedError extends MeshError {
  constructor() {
    super("Transport is closed");
    this.name = "TransportClosedError";
  }
}

export class PacketTooLargeError extends MeshError {
  constructor(size: number) {
    super(`Message longer than 512 bytes (got ${size}), it will not be sent!`);
    this.name = "PacketTooLargeError";
  }
}

export class FirmwareTooOldError extends MeshError {
  constructor(public readonly firmwareVersion: string) {
    super(`Firmware ${firmwareVersion} is too old for this client`);
    this.name = "FirmwareTooOldError";
  }
}

export class HandshakeTimeoutError extends MeshError {
  constructor(public readonly stage: "config" | "nodedb") {
    super(`Device stopped responding during the ${stage} handshake stage`);
    this.name = "HandshakeTimeoutError";
  }
}
