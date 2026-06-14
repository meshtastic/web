import { eventBus } from "@core/utils/eventBus.ts";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("EventBus", () => {
  beforeEach(() => {
    // Reset event listeners before each test
    eventBus.offAll();
  });

  it("should register an event listener and trigger it on emit", () => {
    const mockCallback = vi.fn();

    eventBus.on("dialog:unsafeRoles", mockCallback);
    eventBus.emit("dialog:unsafeRoles", { action: "confirm" });

    expect(mockCallback).toHaveBeenCalledWith({ action: "confirm" });
  });

  it("should remove an event listener with off", () => {
    const mockCallback = vi.fn();

    eventBus.on("dialog:unsafeRoles", mockCallback);
    eventBus.off("dialog:unsafeRoles", mockCallback);
    eventBus.emit("dialog:unsafeRoles", { action: "dismiss" });

    expect(mockCallback).not.toHaveBeenCalled();
  });

  it("should return an unsubscribe function from on", () => {
    const mockCallback = vi.fn();
    const unsubscribe = eventBus.on("dialog:unsafeRoles", mockCallback);

    unsubscribe();
    eventBus.emit("dialog:unsafeRoles", { action: "confirm" });

    expect(mockCallback).not.toHaveBeenCalled();
  });

  it("should allow multiple listeners for the same event", () => {
    const mockCallback1 = vi.fn();
    const mockCallback2 = vi.fn();

    eventBus.on("dialog:unsafeRoles", mockCallback1);
    eventBus.on("dialog:unsafeRoles", mockCallback2);
    eventBus.emit("dialog:unsafeRoles", { action: "confirm" });

    expect(mockCallback1).toHaveBeenCalledWith({ action: "confirm" });
    expect(mockCallback2).toHaveBeenCalledWith({ action: "confirm" });
  });

  it("should only remove the specific listener when off is called", () => {
    const mockCallback1 = vi.fn();
    const mockCallback2 = vi.fn();

    eventBus.on("dialog:unsafeRoles", mockCallback1);
    eventBus.on("dialog:unsafeRoles", mockCallback2);
    eventBus.off("dialog:unsafeRoles", mockCallback1);
    eventBus.emit("dialog:unsafeRoles", { action: "dismiss" });

    expect(mockCallback1).not.toHaveBeenCalled();
    expect(mockCallback2).toHaveBeenCalledWith({ action: "dismiss" });
  });

  it("should not fail when calling off on a non-existent listener", () => {
    const mockCallback = vi.fn();
    eventBus.off("dialog:unsafeRoles", mockCallback);
    eventBus.emit("dialog:unsafeRoles", { action: "confirm" });

    expect(mockCallback).not.toHaveBeenCalled(); // No error should occur
  });
});
