// Browser hardware utilities
export * from "./browserSerial";
export * from "./browserBluetooth";

// Legacy re-export for backward compatibility
export { BrowserHardware } from "./BrowserHardware";

// Connection management
export { ConnectionService } from "./connection/ConnectionService";
export type { NavigationIntent } from "./connection/ConnectionService";

// Transport factory
export * as transportFactory from "./connection/transportFactory";
export type {
  PacketTransport,
  TransportResult,
} from "./connection/transportFactory";

// Device setup
export * as deviceSetup from "./connection/deviceSetup";
export type { SetupContext, SetupCallbacks } from "./connection/deviceSetup";

// Hardware status
export * as hardwareStatus from "./connection/hardwareStatus";
