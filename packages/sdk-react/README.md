# @meshtastic/sdk-react

React hooks and provider for `@meshtastic/sdk`.

## Install

```sh
pnpm add @meshtastic/sdk @meshtastic/sdk-react @meshtastic/transport-web-serial
```

## Quickstart

```tsx
import { MeshClient } from "@meshtastic/sdk";
import { MeshProvider, useDevice, useChat } from "@meshtastic/sdk-react";
import { TransportWebSerial } from "@meshtastic/transport-web-serial";
import { ChannelNumber } from "@meshtastic/sdk";

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
  return <div>{status} / {myNodeNum} / {messages.length} msgs</div>;
}
```

All hooks are read-only against a single `MeshClient` instance supplied through context. Commands are returned as stable functions.

## License

GPL-3.0-only.
