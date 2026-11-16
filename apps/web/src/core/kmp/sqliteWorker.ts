import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
import { serveSqliteWorker } from "@meshtastic/sdk-kmp/sqlite-worker-core";

serveSqliteWorker(sqlite3InitModule);
