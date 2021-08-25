import {
  IBLEConnection,
  IHTTPConnection,
  ISerialConnection,
} from '@meshtastic/meshtasticjs';

export const connection = new IHTTPConnection();
export const bleConnection = new IBLEConnection();
export const serialConnection = new ISerialConnection();
