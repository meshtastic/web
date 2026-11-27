import { describe, expect, it, vi } from "vitest";
import {
  connectErrorKind,
  connectFailure,
  reconnectAttempt,
  toConnectionStatus,
} from "./connectionState.ts";
import { state } from "./fakeClient.ts";

vi.mock("i18next", () => ({ t: (key: string) => key }));

function named(name: string, message = name): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

describe("toConnectionStatus", () => {
  it("maps every SDK state onto a saved-connection status", () => {
    expect(toConnectionStatus(state("disconnected"))).toBe("disconnected");
    expect(toConnectionStatus(state("connecting", { attempt: 1 }))).toBe(
      "connecting",
    );
    expect(toConnectionStatus(state("configuring", { phase: "Stage2" }))).toBe(
      "configuring",
    );
    expect(toConnectionStatus(state("connected"))).toBe("configured");
    expect(toConnectionStatus(state("reconnecting", { attempt: 3 }))).toBe(
      "connecting",
    );
  });
});

describe("reconnectAttempt", () => {
  it("exposes attempt n of maxAttempts only while reconnecting", () => {
    expect(
      reconnectAttempt(state("reconnecting", { attempt: 4, maxAttempts: 10 })),
    ).toEqual({ attempt: 4, maxAttempts: 10 });
    expect(reconnectAttempt(state("connecting", { attempt: 1 }))).toBe(
      undefined,
    );
  });
});

describe("connectFailure", () => {
  it("treats a denied Local Network Access permission as terminal", () => {
    expect(connectErrorKind(named("lna-denied"))).toBe("lna-denied");
    expect(connectFailure(named("lna-denied"))).toEqual({
      status: "error",
      error: "connections:errors.localNetworkDenied",
      errorKind: "lna-denied",
    });
  });

  it("leaves a connection disconnected when the permission still needs a prompt", () => {
    expect(connectFailure(named("lna-prompt"))).toMatchObject({
      status: "disconnected",
      errorKind: "network",
    });
  });

  it("surfaces handshake timeouts and firmware errors", () => {
    expect(connectFailure(named("handshake-timeout"))).toEqual({
      status: "error",
      error: "connections:errors.handshakeTimeout",
      errorKind: "interrupted",
    });
    expect(
      connectFailure(
        named("firmware-too-old", "Firmware requires newer client"),
      ),
    ).toEqual({
      status: "error",
      error: "Firmware requires newer client",
      errorKind: undefined,
    });
  });

  it("marks a serial port held by another tab or app as busy", () => {
    expect(connectFailure(named("serial-busy"))).toEqual({
      status: "error",
      error: "connections:errors.serialBusy",
      errorKind: "busy",
    });
  });

  it("classifies anything else as a network error with its message", () => {
    expect(connectErrorKind(new Error("boom"))).toBe("transport");
    expect(connectFailure(new Error("boom"))).toEqual({
      status: "error",
      error: "boom",
      errorKind: "network",
    });
    expect(connectFailure("oops")).toMatchObject({ error: "oops" });
  });
});
