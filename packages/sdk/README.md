# @meshtastic/sdk

TypeScript SDK for talking to [Meshtastic](https://meshtastic.org) radios. Works in the browser, in
Node, and in Deno. Pick a transport, hand it a `MeshClient`, and you've got reactive access to the
device's chat, nodes, channels, config, and telemetry.

```sh
pnpm add @meshtastic/sdk @meshtastic/transport-web-serial
```

## Quick example

```ts
import { MeshClient } from "@meshtastic/sdk";
import { TransportWebSerial } from "@meshtastic/transport-web-serial";

const transport = await TransportWebSerial.create({ baudRate: 115200 });
const client = new MeshClient({ transport });
await client.connect();

client.device.status.subscribe((s) => console.log("status:", s));
console.log("my node:", client.device.myNodeNum.value);
console.log("nodes:", client.nodes.list.value);

await client.chat.send({ text: "hello mesh" });

client.events.onConfigComplete.subscribe(() => console.log("configured"));
client.events.onRebooted.subscribe(() => console.log("device rebooted"));
```

State is exposed as signals. Subscribe to them, or read `.value` synchronously. Commands are async and
resolve when the device acks.

## Why this is a new package

If you've used Meshtastic on the web before, you've probably seen `@meshtastic/core`. That package
mixed protocol, transports, and consumer state in one class. It worked, but it bled assumptions:
browser apps still pulled the Node serial driver, slice state had a few React-isms baked in, and there
wasn't a clean seam for unit testing or non-browser runtimes.

We split it into three pieces:

- `@meshtastic/sdk` (this one) owns the protocol, the queue, the codec, and the reactive state. No
  React. No DOM. No Node builtins. It runs the same everywhere.
- `@meshtastic/transport-*` packages are thin byte adapters. Install only the ones you need. The SDK
  talks to them through a tiny `Transport` interface (`fromDevice` / `toDevice` streams plus
  `disconnect()`), so you can write your own without forking anything.
- `@meshtastic/sdk-react` lives separately for the React hooks. Skip it if you're not using React.

The old `MeshDevice` class is still exported from `src/shim/` so existing `@meshtastic/core` apps can
upgrade without a full rewrite. The shim will be removed once the web client finishes its migration —
new code should use `MeshClient` directly.

## What's in the client

`MeshClient` is just a small composition root. The interesting bits are the feature clients hanging
off it:

- `client.device` — identity, status, metadata, reboot / shutdown / factory-reset
- `client.chat` — channel + direct messages, drafts, unread tracking
- `client.nodes` — live node list, per-node lookups, error states
- `client.channels` — channel config
- `client.config` — device + module config, plus a staged-edit `ConfigEditor`
- `client.telemetry` — environment / device / power metrics
- `client.position` — position broadcast + node positions
- `client.traceroute` — mesh route discovery
- `client.files` — XModem get/put

Each one can be used on its own; `MeshClient` just hands them a shared transport, queue, and event
bus.

## Subpath exports

| Import path | What's there |
| --- | --- |
| `@meshtastic/sdk` | `MeshClient`, feature clients, signal types |
| `@meshtastic/sdk/transport` | The `Transport` interface and related types — use this if you're writing a custom adapter |
| `@meshtastic/sdk/protobuf` | Re-export of `@meshtastic/protobufs` for raw packet construction |
| `@meshtastic/sdk/testing` | `createFakeTransport()` for unit tests |

## Testing without a radio

```ts
import { MeshClient } from "@meshtastic/sdk";
import { createFakeTransport } from "@meshtastic/sdk/testing";

const { transport, respond } = createFakeTransport();
const client = new MeshClient({ transport });

respond.withMyNodeInfo({ myNodeNum: 42 });
respond.withConfigCompleteId(1);

// client.device, client.nodes, etc. are now populated.
```

The fake transport is the same one the SDK's own integration tests use.

## React?

[`@meshtastic/sdk-react`](https://www.npmjs.com/package/@meshtastic/sdk-react).

## Source / issues

<https://github.com/meshtastic/web>

## License

GPL-3.0-only.
