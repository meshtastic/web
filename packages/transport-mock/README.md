# @meshtastic/transport-mock

A mock transport layer for Meshtastic applications, enabling development and testing without a physical device.

## Installation

```bash
pnpm add @meshtastic/transport-mock
```

## Usage

### Basic Usage

```typescript
import { MeshDevice } from "@meshtastic/core";
import { TransportMock } from "@meshtastic/transport-mock";

// Create mock transport with default scenario (5 nodes in SF)
const transport = TransportMock.create();

// Use exactly like a real transport
const device = new MeshDevice(transport, "mock-device");
await device.configureTwoStage();
```

### With Scenarios

```typescript
import { TransportMock, scenarios } from "@meshtastic/transport-mock";

// Use a predefined scenario
const transport = TransportMock.create({
  scenario: "large",  // 25 nodes for stress testing
});

// Or use minimal for just local node
const minimal = TransportMock.create({
  scenario: "minimal",
});
```

### Custom Scenario

```typescript
import { TransportMock, createScenario, generateMeshNodes } from "@meshtastic/transport-mock";

const customScenario = createScenario({
  name: "my-test",
  description: "Custom test mesh",
  myNodeNum: 0xDEADBEEF,
  centerLat: 51.5074,
  centerLon: -0.1278,
  nodes: generateMeshNodes(10, 51.5074, -0.1278, 5),
  simulateMessages: true,
  simulatePositions: true,
  simulateTelemetry: true,
  activityIntervalMs: 10000,
});

const transport = TransportMock.create({
  scenario: customScenario,
});
```

### Available Scenarios

| Scenario | Nodes | Description |
|----------|-------|-------------|
| `default` | 5 | Small mesh in San Francisco |
| `large` | 25 | Stress test with 25 nodes |
| `minimal` | 0 | Just the local device |
| `dense` | 15 | Dense urban mesh (NYC, 1km radius) |

### Configuration Options

```typescript
interface MockTransportOptions {
  /** Scenario name or custom scenario object */
  scenario?: string | MockScenario;

  /** Override the node number for the local device */
  nodeNum?: number;

  /** Delay before sending config packets (default: 100ms) */
  configDelayMs?: number;

  /** Delay between individual packets (default: 20ms) */
  packetDelayMs?: number;

  /** Enable debug logging to console (default: false) */
  debug?: boolean;
}
```

## Features

- **Full Transport Interface**: Implements `Types.Transport` from `@meshtastic/core`
- **Realistic Config Sequence**: Simulates the two-stage configuration flow
- **Mesh Simulation**: Generates realistic node info, positions, and telemetry
- **Activity Simulation**: Optionally generates periodic messages, positions, and telemetry
- **Customizable Scenarios**: Use predefined scenarios or create your own
- **Zero Hardware**: Perfect for UI development and automated testing

## Simulated Data

The mock transport generates realistic:

- **Device Config**: Device, position, power, network, display, LoRa, Bluetooth, security
- **Module Config**: MQTT, serial, telemetry, canned messages, etc.
- **Channels**: Primary channel with default PSK + 7 disabled channels
- **Node Info**: User details, hardware model, positions, device metrics
- **Mesh Packets**: Text messages, position updates, telemetry data

## Development

```bash
# Build the package
pnpm build:npm

# Run in debug mode
const transport = TransportMock.create({ debug: true });
```

## License

GPL-3.0-only
