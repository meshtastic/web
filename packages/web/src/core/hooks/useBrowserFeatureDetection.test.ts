import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useBrowserFeatureDetection } from "./useBrowserFeatureDetection.ts";

describe("useBrowserFeatureDetection", () => {
  const originalNavigator = { ...global.navigator };
  const originalLocation = global.location;

  beforeEach(() => {
    // Reset mocks
    Object.defineProperty(global, "navigator", {
      value: { ...originalNavigator },
      writable: true,
    });
    delete (global as any).location;
    global.location = {
      ...originalLocation,
      protocol: "http:",
      hostname: "example.com",
    } as any;
  });

  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
    });
    global.location = originalLocation;
  });

  it("should detect all features supported", () => {
    (navigator as any).bluetooth = {};
    (navigator as any).serial = {};
    global.location.protocol = "https:";

    const { result } = renderHook(() => useBrowserFeatureDetection());

    expect(result.current.supported).toContain("Web Bluetooth");
    expect(result.current.supported).toContain("Web Serial");
    expect(result.current.supported).toContain("Secure Context");
    expect(result.current.unsupported).toHaveLength(0);
  });

  it("should detect features unsupported", () => {
    (navigator as any).bluetooth = undefined;
    (navigator as any).serial = undefined;
    global.location.protocol = "http:";
    global.location.hostname = "example.com";

    const { result } = renderHook(() => useBrowserFeatureDetection());

    expect(result.current.unsupported).toContain("Web Bluetooth");
    expect(result.current.unsupported).toContain("Web Serial");
    expect(result.current.unsupported).toContain("Secure Context");
    expect(result.current.supported).toHaveLength(0);
  });

  it("should detect Secure Context on localhost http", () => {
    (navigator as any).bluetooth = undefined;
    (navigator as any).serial = undefined;
    global.location.protocol = "http:";
    global.location.hostname = "localhost";

    const { result } = renderHook(() => useBrowserFeatureDetection());

    expect(result.current.supported).toContain("Secure Context");
  });
});
