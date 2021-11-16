import {
  IBLEConnection,
  IHTTPConnection,
  ISerialConnection,
} from '@meshtastic/meshtasticjs';

type connectionType = IBLEConnection | IHTTPConnection | ISerialConnection;

export let connection: connectionType = new IHTTPConnection();

export const ble = new IBLEConnection();
export const serial = new ISerialConnection();

export const setConnection = (conn: connectionType): void => {
  connection = conn;
};
