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

### Upgrading from `@meshtastic/core`

You don't have to port everything at once. `@meshtastic/sdk` re-exports the old `MeshDevice` class
from `src/shim/`, with the same public surface it had in core, so most apps can swap the dependency
and keep building while they migrate file by file.

Treat the shim as a moving truck, not furniture. New code should target `MeshClient` and the feature
clients directly — that's where everything new lands (the `onRebooted` event added in this release,
for instance, is on `client.events`, not the shim). We'll delete `src/shim/` once the web client
itself is fully off `MeshDevice`, so don't build anything new on top of it.

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

## Using this with React

You can use `@meshtastic/sdk` straight from a React component — every signal exposes a `.subscribe()`
that pairs cleanly with `useSyncExternalStore`, and `.value` for synchronous reads. If you want to
write that bridge yourself, go ahead; nothing in the SDK requires React.

For most apps it's not worth it. [`@meshtastic/sdk-react`](https://www.npmjs.com/package/@meshtastic/sdk-react)
ships the bridge plus a set of opinionated hooks:

- `MeshProvider` / `MeshRegistryProvider` so you don't have to thread the `MeshClient` through props.
  The registry provider is useful when an app holds connections to several radios at once (USB +
  Bluetooth in a desktop dashboard, for example) and you want hooks to default to the active one.
- Hooks that mirror the feature clients — `useDevice`, `useChat`, `useNodes`, `useChannels`,
  `useConfig`, `useConnectionProgress`, and so on — each scoped to a single signal so re-renders stay
  narrow.
- `useSignal` / `useSignalValue` escape hatches for the cases where the bundled hooks aren't quite
  the right shape.

The bindings are kept in a separate package on purpose. Node CLIs, Deno scripts, and embedded use
cases all consume `@meshtastic/sdk` without dragging React along — the dependency only enters the
tree when you actually need it.

## Source / issues

<https://github.com/meshtastic/web>

## License

GPL-3.0-only.
