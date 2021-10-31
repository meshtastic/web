import {
  IBLEConnection,
  IHTTPConnection,
  ISerialConnection,
} from '@meshtastic/meshtasticjs';

type connectionType = IBLEConnection | IHTTPConnection | ISerialConnection;

export let connection: connectionType = new IHTTPConnection();

export const setConnection = (conn: connectionType): void => {
  connection = conn;
};
