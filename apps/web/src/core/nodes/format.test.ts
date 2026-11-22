import { describe, expect, it } from "vitest";
import {
  formatCoordinates,
  formatDistance,
  formatLastHeard,
  formatPercent,
  formatSnrValue,
  formatVoltageValue,
  openStreetMapUrl,
} from "./format.ts";

const NOW = Date.UTC(2026, 10, 21, 12);

describe("formatDistance", () => {
  it("uses metres under a kilometre", () => {
    expect(formatDistance(849.6, "en")).toBe("850 m");
  });

  it("uses one decimal of kilometres under 100 km", () => {
    expect(formatDistance(12_345, "en")).toBe("12.3 km");
    expect(formatDistance(1000, "en")).toBe("1 km");
  });

  it("drops decimals from 100 km", () => {
    expect(formatDistance(250_400, "en")).toBe("250 km");
  });

  it("follows the locale", () => {
    expect(formatDistance(12_345, "de")).toBe("12,3 km");
  });
});

describe("formatSnrValue", () => {
  it("always shows one decimal", () => {
    expect(formatSnrValue(-9, "en")).toBe("-9.0");
    expect(formatSnrValue(4.25, "en")).toBe("4.3");
  });
});

describe("formatPercent", () => {
  it("formats whole percentages by default", () => {
    expect(formatPercent(87, "en")).toBe("87%");
    expect(formatPercent(12.345, "en", 1)).toBe("12.3%");
  });
});

describe("formatVoltageValue", () => {
  it("shows two decimals of volts", () => {
    expect(formatVoltageValue(3.9, "en")).toBe("3.90");
  });
});

describe("formatLastHeard", () => {
  it("is undefined for a node never heard", () => {
    expect(formatLastHeard(undefined, NOW, "en")).toBeUndefined();
  });

  it("formats relative to now", () => {
    expect(formatLastHeard(NOW - 3 * 60_000, NOW, "en")).toBe("3 minutes ago");
  });

  it("clamps future timestamps from clock skew to now", () => {
    expect(formatLastHeard(NOW + 90_000, NOW, "en")).toBe("now");
  });
});

describe("coordinates", () => {
  it("formats lat, lng with five decimals", () => {
    expect(formatCoordinates([-122.4194, 37.7749], "en")).toBe(
      "37.77490, -122.41940",
    );
  });

  it("links to OpenStreetMap at the position", () => {
    expect(openStreetMapUrl([2.5, 48.75])).toBe(
      "https://www.openstreetmap.org/?mlat=48.75&mlon=2.5#map=15/48.75/2.5",
    );
  });
});
