import { describe, expect, it } from "vitest";
import { convertIntToIpAddress, convertIpAddressToInt } from "./ip.ts";

describe("IP Address Conversion Functions", () => {
  describe("convertIntToIpAddress", () => {
    it("converts 0 to 0.0.0.0", () => {
      expect(convertIntToIpAddress(0)).toBe("0.0.0.0");
    });

    it("converts 16_777_343  to 127.0.0.1", () => {
      expect(convertIntToIpAddress(16_777_343)).toBe("127.0.0.1");
    });

    it("converts  16_820_416 to 192.168.0.1", () => {
      expect(convertIntToIpAddress(16_820_416)).toBe("192.168.0.1");
    });

    it("converts 4_294_967_295 to 255.255.255.255", () => {
      expect(convertIntToIpAddress(4_294_967_295)).toBe("255.255.255.255");
    });
  });

  describe("convertIpAddressToInt", () => {
    it("converts 0.0.0.0 to 0", () => {
      expect(convertIpAddressToInt("0.0.0.0")).toBe(0);
    });

    it("converts 127.0.0.1 to 16_777_343", () => {
      expect(convertIpAddressToInt("127.0.0.1")).toBe(16_777_343);
    });

    it("converts 192.168.0.1 to 16_820_416", () => {
      expect(convertIpAddressToInt("192.168.0.1")).toBe(16_820_416);
    });

    it("converts 255.255.255.255 to 4_294_967_295", () => {
      expect(convertIpAddressToInt("255.255.255.255")).toBe(4_294_967_295);
    });

    it("handles non-standard formats", () => {
      expect(convertIpAddressToInt("1.2.3.4")).toBe(67_305_985);
    });

    it("handles invalid IP addresses gracefully", () => {
      expect(convertIpAddressToInt("300.1.2.3")).not.toBeNull();
      expect(typeof convertIpAddressToInt("300.1.2.3")).toBe("number");
    });
  });

  describe("bidirectional conversion", () => {
    it("can convert back and forth", () => {
      const testIps = [
        "0.0.0.0",
        "127.0.0.1",
        "192.168.1.1",
        "10.0.0.1",
        "255.255.255.255",
      ];

      for (const ip of testIps) {
        const int = convertIpAddressToInt(ip);
        expect(int).not.toBeNull();
        if (int !== null && typeof int === "number") {
          const convertedBack = convertIntToIpAddress(int);
          expect(convertedBack).toBe(ip);
        }
      }
    });
  });
});
