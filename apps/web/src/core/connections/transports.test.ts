import type { Connection } from "@core/stores/deviceStore/types";
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
  const getPorts = vi.fn();
  const requestPort = vi.fn();
  const savedSerial: Connection = {
    id: 1,
    name: "Serial: 303a:1001",
    type: "serial",
    status: "disconnected",
    createdAt: 0,
    usbVendorId: info.usbVendorId,
    usbProductId: info.usbProductId,
  };
  const savedFilter = {
    filters: [
      {
        usbVendorId: info.usbVendorId,
        usbProductId: info.usbProductId,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getPorts.mockResolvedValue([portA, portB]);
    requestPort.mockResolvedValue(selectedPort);
    Object.defineProperty(navigator, "serial", {
      configurable: true,
      value: { getPorts, requestPort },
    });
    vi.mocked(TransportWebSerial.createFromPort).mockResolvedValue(
      Result.ok({} as never),
    );
  });

  it("prompts when multiple permitted ports share the saved VID/PID", async () => {
    await openTransport(savedSerial, { allowPrompt: true });

    expect(requestPort).toHaveBeenCalledOnce();
    expect(requestPort).toHaveBeenCalledWith(savedFilter);
    expect(TransportWebSerial.createFromPort).toHaveBeenCalledWith(
      selectedPort,
    );
  });

  it("uses the only permitted port matching the saved VID/PID without prompting", async () => {
    const otherPort = {
      getInfo: () => ({ usbVendorId: 0x10c4, usbProductId: 0xea60 }),
    } as SerialPort;
    getPorts.mockResolvedValue([otherPort, portA]);

    await openTransport(savedSerial, { allowPrompt: true });

    expect(requestPort).not.toHaveBeenCalled();
    expect(TransportWebSerial.createFromPort).toHaveBeenCalledWith(portA);
  });

  it("refuses to guess between ports sharing the saved VID/PID when prompting is not allowed", async () => {
    await expect(
      openTransport(savedSerial, { allowPrompt: false }),
    ).rejects.toThrow("Serial port not available");

    expect(requestPort).not.toHaveBeenCalled();
    expect(TransportWebSerial.createFromPort).not.toHaveBeenCalled();
  });

  it("filters the picker to the saved VID/PID when no permitted port matches", async () => {
    getPorts.mockResolvedValue([]);

    await openTransport(savedSerial, { allowPrompt: true });

    expect(requestPort).toHaveBeenCalledOnce();
    expect(requestPort).toHaveBeenCalledWith(savedFilter);
    expect(TransportWebSerial.createFromPort).toHaveBeenCalledWith(
      selectedPort,
    );
  });
});
