import { describe, expect, it } from "vitest";
import { redactText } from "./redact.ts";

describe("redactText", () => {
  it.each([
    [
      "https://192.168.1.40/api/v1/fromradio",
      "https://<host>/api/v1/fromradio",
    ],
    ["http://meshtastic.local:8080/x", "http://<host>:8080/x"],
    ["https://[fe80::1]:443/", "https://<host>:443/"],
    ["wss://example.org/socket", "wss://<host>/socket"],
    [
      "https://127.0.0.1:9443/api/v1/fromradio?all=false",
      "https://<host>:9443/api/v1/fromradio?all=false",
    ],
    [
      "http://localhost:5201/i18n/locales/en-GB/channels.json",
      "http://<host>:5201/i18n/locales/en-GB/channels.json",
    ],
  ])(
    "masks the host in %s but keeps scheme, port and path",
    (input, output) => {
      expect(redactText(input)).toBe(output);
    },
  );

  it("masks bare IPv4, IPv6 and .local names", () => {
    expect(
      redactText(
        "peer 10.0.0.12 via fe80::a00:27ff:fe4e:66a1 and 2001:db8:0:0:0:0:2:1 or my-radio.local",
      ),
    ).toBe("peer <ip> via <ip> and <ip> or <host>");
  });

  it("leaves clock times and firmware versions alone", () => {
    expect(redactText("at 12:34:56 fw 2.8.1.8e6a88d took 10.5s")).toBe(
      "at 12:34:56 fw 2.8.1.8e6a88d took 10.5s",
    );
  });

  it("masks named and paired coordinates", () => {
    expect(redactText("latitude_i=450000000 longitudeI: -756972000")).toBe(
      "latitude_i=<redacted> longitudeI: <redacted>",
    );
    expect(redactText('{"latitude": 45.4215, "lon":-75.69}')).toBe(
      '{"latitude": <redacted>, "lon":<redacted>}',
    );
    expect(redactText("at 45.42153, -75.69719 now")).toBe("at <coords> now");
  });

  it("masks long base64 and hex runs that look like keys", () => {
    expect(
      redactText(
        "psk 1PG7OiApB1nwvP+rz05pAQ== key a3f9c2d4e5b6a7980a1b2c3d4e5f6a7b8c9d",
      ),
    ).toBe("psk <redacted> key <redacted>");
  });

  it("keeps ordinary log text unchanged", () => {
    const line =
      "MeshEngine: Handshake timed out during stage: Seeding Session (id=3217897557) in processSeedingEnvelope";
    expect(redactText(line)).toBe(line);
  });
});
