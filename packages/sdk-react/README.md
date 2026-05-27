# @meshtastic/sdk-react

React hooks for [`@meshtastic/sdk`](https://www.npmjs.com/package/@meshtastic/sdk). Wraps the SDK's
signal-based state in hooks that only re-render when the data they touch changes.

```sh
pnpm add @meshtastic/sdk @meshtastic/sdk-react @meshtastic/transport-web-serial
```

## One device

If your app talks to a single radio at a time, wrap your tree in `MeshProvider` and you're done:

```tsx
import { MeshClient, ChannelNumber } from "@meshtastic/sdk";
import { MeshProvider, useDevice, useChat } from "@meshtastic/sdk-react";
import { TransportWebSerial } from "@meshtastic/transport-web-serial";

const transport = await TransportWebSerial.create({ baudRate: 115200 });
const client = new MeshClient({ transport });
await client.connect();

function App() {
  return (
    <MeshProvider client={client}>
      <Status />
    </MeshProvider>
  );
}

function Status() {
  const { status, myNodeNum } = useDevice();
  const { messages, send } = useChat(ChannelNumber.Primary);
  return (
    <div>
      {status} · node #{myNodeNum} · {messages.length} msgs
      <button onClick={() => send("hello mesh")}>send</button>
    </div>
  );
}
```

## Several devices

For apps that hold multiple connections at once — say, a desktop dashboard with a USB device plus a
Bluetooth one — use the registry provider instead. Hooks default to the "active" client, and you can
target a specific one by id when you need to.

```tsx
import { MeshRegistry } from "@meshtastic/sdk";
import { MeshRegistryProvider, useNodes } from "@meshtastic/sdk-react";

const registry = new MeshRegistry();
registry.register("usb-1", usbClient);
registry.register("ble-1", bleClient);
registry.setActive("usb-1");

function App() {
  return (
    <MeshRegistryProvider registry={registry}>
      <Nodes />
    </MeshRegistryProvider>
  );
}

function Nodes() {
  const nodes = useNodes(); // active client
  return <div>{nodes.length} nodes</div>;
}
```

## Why this is a separate package

The SDK used to live in `@meshtastic/core`, and its React conventions (effects, refs, a few hook
helpers) were baked right into protocol code. That made it impossible to ship the SDK to non-React
consumers — Node CLIs, Deno scripts, native shells — without dragging React along.

When we split that up, the React bits moved here. Now the layering is straightforward:

- `@meshtastic/sdk` — protocol, state, transports. No React, no DOM.
- `@meshtastic/sdk-react` — this. Hooks and providers, nothing else.
- `@meshtastic/transport-*` — per-runtime byte transports.

If you're not using React, you don't need this package at all. Read `@meshtastic/sdk` directly.

## Hooks

Most components only need two or three of these. The full list is here for reference:

**Plumbing**

- `useClient()` — the client from `MeshProvider`
- `useActiveClient()` — the active client from a `MeshRegistryProvider`
- `useClientById(id)` — a specific client from the registry
- `useMeshRegistry()` / `useOptionalMeshRegistry()` — the registry itself
- `useSignal(signal)` / `useSignalValue(signal)` — bridge any SDK signal into React state

**Connection**

- `useConnection()` — status + lifecycle helpers
- `useConnectionProgress()` — live "configuring" progress with per-section counters (handy for
  building a connecting overlay)
- `useMeshDevice()` — convenience wrapper around the legacy `MeshDevice` shim

**Device & node state**

- `useDevice()`
- `useNodes()` / `useNode(num)`
- `useNodeError(num)` / `useNodeErrors()` / `useHasNodeError(num)`

**Messaging**

- `useChat(channel)` — channel messages
- `useDirectChat(peer)` — DMs
- `useDraft(...)` — draft messages

**Config**

- `useChannels()` / `useChannel(idx)`
- `useConfig()` / `useModuleConfig()` / `useIsRegionUnset()`
- `useConfigEditor()` — staged edits with dirty tracking

Each hook reads from a single signal, so updates only re-render components that actually use that
data.

## Source / issues

<https://github.com/meshtastic/web>

## License

GPL-3.0-only.
