/**
 * Phase-A compatibility shim: forwards the legacy `Utils` namespace from
 * `@meshtastic/core`. Removed in Phase C.
 */
export { EventBus as EventSystem } from "../core/event-bus/EventBus.ts";
export { Queue } from "../core/queue/Queue.ts";
export { Xmodem } from "../core/xmodem/Xmodem.ts";
export { fromDeviceStream } from "../core/packet-codec/fromDevice.ts";
export { toDeviceStream } from "../core/packet-codec/toDevice.ts";
