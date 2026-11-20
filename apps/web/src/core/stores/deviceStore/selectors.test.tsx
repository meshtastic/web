import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useDeviceStore } from "./index.ts";
import { useDisplayedConnection } from "./selectors.ts";
import type { Connection } from "./types.ts";

const http: Connection = {
  id: 1,
  type: "http",
  name: "http",
  url: "http://meshtastic.local",
  createdAt: 0,
  status: "connected",
};
const serial: Connection = {
  id: 2,
  type: "serial",
  name: "Serial",
  createdAt: 0,
  status: "disconnected",
  isDefault: true,
};

describe("useDisplayedConnection", () => {
  beforeEach(() => {
    act(() => {
      useDeviceStore.setState({ savedConnections: [http, serial] });
      useDeviceStore.getState().setActiveConnectionId(null);
    });
  });

  it("prefers the active connection, then the default, then the first saved", () => {
    act(() => {
      useDeviceStore.getState().setActiveConnectionId(http.id);
    });
    const { result } = renderHook(() => useDisplayedConnection());
    expect(result.current?.id).toBe(http.id);

    act(() => {
      useDeviceStore.getState().setActiveConnectionId(null);
    });
    expect(result.current?.id).toBe(serial.id);

    act(() => {
      useDeviceStore.setState({
        savedConnections: [http, { ...serial, isDefault: false }],
      });
    });
    expect(result.current?.id).toBe(http.id);
  });
});
