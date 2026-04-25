# @meshtastic/sdk-storage-sqlocal

SQLite WASM persistence adapters for `@meshtastic/sdk`. Implements the SDK's per-slice repository ports (`MessageRepository`, future `NodesRepository`, `TelemetryRepository`) against a single OPFS-backed SQLite database.

Drizzle ORM provides typed queries; sqlocal handles the WASM runtime and OPFS-backed storage. Multi-tab coordination uses the Web Locks API for write exclusion and BroadcastChannel for cross-tab change notifications.

## Install

```sh
pnpm add @meshtastic/sdk @meshtastic/sdk-storage-sqlocal
```

## Headers

OPFS in browsers requires cross-origin isolation. Serve your app with:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

## Quickstart

```ts
import { MeshClient, MeshRegistry } from "@meshtastic/sdk";
import { createSqlocalDb } from "@meshtastic/sdk-storage-sqlocal";
import { SqlocalMessageRepository } from "@meshtastic/sdk-storage-sqlocal/chat";

const db = await createSqlocalDb({ databasePath: "meshtastic.db" });

const registry = new MeshRegistry();
registry.create(connectionId, {
  transport,
  chat: {
    repository: new SqlocalMessageRepository(db, { deviceId: connectionId }),
    retention: { maxPerBucket: 1000, olderThanMs: 90 * 24 * 60 * 60 * 1000 },
  },
});
```

## Schema

Single database per origin. Every table has a `device_id` column so a multi-device `MeshRegistry` can share one DB safely.

| Table | Purpose |
| --- | --- |
| `messages` | Chat (text + waypoints) |
| `nodes` | Node DB snapshot per device |
| `telemetry` | Per-node ring buffer of telemetry readings |
| `_schema` | Migration version |

## License

GPL-3.0-only.
