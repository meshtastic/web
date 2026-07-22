import { TransportWebSerial } from "@meshtastic/transport-web-serial";
import { Result } from "better-result";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openTransport } from "./transports.ts";

vi.mock("@meshtastic/transport-web-serial", () => ({
  SerialConnectError: class SerialConnectError extends Error {},
  TransportWebSerial: { createFromPort: vi.fn() },
}));

describe("openTransport serial selection", () => {
  const info = { usbVendorId: 0x303a, usbProductId: 0x1001 };
  const portA = { getInfo: () => info } as SerialPort;
  const portB = { getInfo: () => info } as SerialPort;
  const selectedPort = { getInfo: () => info } as SerialPort;
  const requestPort = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    requestPort.mockResolvedValue(selectedPort);
    Object.defineProperty(navigator, "serial", {
      configurable: true,
      value: {
        getPorts: vi.fn().mockResolvedValue([portA, portB]),
        requestPort,
      },
    });
    vi.mocked(TransportWebSerial.createFromPort).mockResolvedValue(
      Result.ok({} as never),
    );
  });

  it("prompts when multiple permitted ports share the saved VID/PID", async () => {
    await openTransport(
      {
        id: 1,
        name: "Serial: 303a:1001",
        type: "serial",
        status: "disconnected",
        usbVendorId: info.usbVendorId,
        usbProductId: info.usbProductId,
      },
      { allowPrompt: true },
    );

    expect(requestPort).toHaveBeenCalledOnce();
    expect(TransportWebSerial.createFromPort).toHaveBeenCalledWith(
      selectedPort,
    );
  });
});
