import { describe, expect, it } from "vitest";
import { isValidHttpAddress, urlOrIpv4Schema } from "./address.ts";

const parse = (value: string) => {
  const result = urlOrIpv4Schema.safeParse(value);
  return result.success ? result.data : undefined;
};

describe("urlOrIpv4Schema", () => {
  it("accepts IPv4 addresses and domains, adding http://", () => {
    expect(parse("192.168.1.50")).toBe("http://192.168.1.50");
    expect(parse("meshtastic.local")).toBe("http://meshtastic.local");
    expect(parse("radio.example.com:8080")).toBe(
      "http://radio.example.com:8080",
    );
  });

  it("keeps a typed scheme", () => {
    expect(parse("https://10.0.0.2:443")).toBe("https://10.0.0.2:443");
  });

  it("accepts localhost and single-label host names", () => {
    expect(parse("localhost")).toBe("http://localhost");
    expect(parse("localhost:4403")).toBe("http://localhost:4403");
    expect(parse("http://localhost:8080")).toBe("http://localhost:8080");
    expect(parse("meshtastic")).toBe("http://meshtastic");
    expect(parse("my-radio:80")).toBe("http://my-radio:80");
  });

  it("strips surrounding space and trailing slashes", () => {
    expect(parse("  meshtastic.local/ ")).toBe("http://meshtastic.local");
    expect(parse("http://192.168.1.50//")).toBe("http://192.168.1.50");
  });

  it("rejects malformed hosts and ports", () => {
    expect(parse("not a host")).toBeUndefined();
    expect(parse("")).toBeUndefined();
    expect(parse("999.1.1.1")).toBeUndefined();
    expect(parse("1.2.3")).toBeUndefined();
    expect(parse("-radio")).toBeUndefined();
    expect(parse("radio..local")).toBeUndefined();
    expect(parse("localhost:5")).toBeUndefined();
    expect(parse("localhost:70000")).toBeUndefined();
    expect(parse("host/path")).toBeUndefined();
  });
});

describe("isValidHttpAddress", () => {
  it("validates without a scheme", () => {
    expect(isValidHttpAddress("10.0.0.1:4403")).toBe(true);
    expect(isValidHttpAddress("bad host")).toBe(false);
  });
});
