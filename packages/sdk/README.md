# @meshtastic/sdk

Domain-driven SDK for Meshtastic devices. Feature slices with signals-backed reactive state.

Replaces `@meshtastic/core`. During migration a shim layer re-exports the legacy `MeshDevice` class so existing consumers keep building — see `src/shim/`.

## Install

```sh
pnpm add @meshtastic/sdk @meshtastic/transport-web-serial
```

## Quickstart

```ts
import { MeshClient } from "@meshtastic/sdk";
import { TransportWebSerial } from "@meshtastic/transport-web-serial";

const transport = await TransportWebSerial.create({ baudRate: 115200 });
const client = new MeshClient({ transport });
await client.connect();

client.chat.send({ text: "hello mesh" });
console.log(client.nodes.list.value);
```

See the repo root [README](../../README.md) for architecture and feature slice layout.

## Layout

```
src/
  core/            # shared kernel: client, transport, event-bus, queue, xmodem, signals, logging, packet-codec
  features/        # DDD feature slices (device, chat, nodes, channels, config, telemetry, position, traceroute, files)
  shim/            # legacy MeshDevice compatibility exports (removed in Phase C)
```

## License

GPL-3.0-only.
