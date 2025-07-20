import { create, toBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import crc16ccitt from "crc/calculators/crc16ccitt";

//if counter > 35 then reset counter/clear/error/reject promise
type XmodemProps = (toRadio: Uint8Array, id?: number) => Promise<number>;

export class Xmodem {
  private sendRaw: XmodemProps;
  private rxBuffer: Uint8Array[];
  private txBuffer: Uint8Array[];
  private textEncoder: TextEncoder;
  private counter: number;

  constructor(sendRaw: XmodemProps) {
    this.sendRaw = sendRaw;
    this.rxBuffer = [];
    this.txBuffer = [];
    this.textEncoder = new TextEncoder();
    this.counter = 0;
  }

  async downloadFile(filename: string): Promise<number> {
    return await this.sendCommand(
      Protobuf.Xmodem.XModem_Control.STX,
      this.textEncoder.encode(filename),
      0,
    );
  }

  async uploadFile(filename: string, data: Uint8Array): Promise<number> {
    for (let i = 0; i < data.length; i += 128) {
      this.txBuffer.push(data.slice(i, i + 128));
    }

    return await this.sendCommand(
      Protobuf.Xmodem.XModem_Control.SOH,
      this.textEncoder.encode(filename),
      0,
    );
  }

  async sendCommand(
    command: Protobuf.Xmodem.XModem_Control,
    buffer?: Uint8Array,
    sequence?: number,
    crc16?: number,
  ): Promise<number> {
    const toRadio = create(Protobuf.Mesh.ToRadioSchema, {
      payloadVariant: {
        case: "xmodemPacket",
        value: {
          buffer,
          control: command,
          seq: sequence,
          crc16: crc16,
        },
      },
    });
    return await this.sendRaw(toBinary(Protobuf.Mesh.ToRadioSchema, toRadio));
  }

  async handlePacket(packet: Protobuf.Xmodem.XModem): Promise<number> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    switch (packet.control) {
      case Protobuf.Xmodem.XModem_Control.NUL: {
        // nothing
        break;
      }
      case Protobuf.Xmodem.XModem_Control.SOH: {
        this.counter = packet.seq;
        if (this.validateCrc16(packet)) {
          this.rxBuffer[this.counter] = packet.buffer;
          return this.sendCommand(Protobuf.Xmodem.XModem_Control.ACK);
        }
        return await this.sendCommand(
          Protobuf.Xmodem.XModem_Control.NAK,
          undefined,
          packet.seq,
        );
      }
      case Protobuf.Xmodem.XModem_Control.STX: {
        break;
      }
      case Protobuf.Xmodem.XModem_Control.EOT: {
        // end of transmission
        break;
      }
      case Protobuf.Xmodem.XModem_Control.ACK: {
        this.counter++;
        if (this.txBuffer[this.counter - 1]) {
          return this.sendCommand(
            Protobuf.Xmodem.XModem_Control.SOH,
            this.txBuffer[this.counter - 1],
            this.counter,
            crc16ccitt(this.txBuffer[this.counter - 1] ?? new Uint8Array()),
          );
        }
        if (this.counter === this.txBuffer.length + 1) {
          return this.sendCommand(Protobuf.Xmodem.XModem_Control.EOT);
        }
        this.clear();
        break;
      }
      case Protobuf.Xmodem.XModem_Control.NAK: {
        return this.sendCommand(
          Protobuf.Xmodem.XModem_Control.SOH,
          this.txBuffer[this.counter],
          this.counter,
          crc16ccitt(this.txBuffer[this.counter - 1] ?? new Uint8Array()),
        );
      }
      case Protobuf.Xmodem.XModem_Control.CAN: {
        this.clear();
        break;
      }
      case Protobuf.Xmodem.XModem_Control.CTRLZ: {
        break;
      }
    }

    return Promise.resolve(0);
  }

  validateCrc16(packet: Protobuf.Xmodem.XModem): boolean {
    return crc16ccitt(packet.buffer) === packet.crc16;
  }

  clear() {
    this.counter = 0;
    this.rxBuffer = [];
    this.txBuffer = [];
  }
}
