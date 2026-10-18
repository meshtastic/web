import { afterEach, describe, expect, it, vi } from "vitest";
import { withLocalNetworkTarget } from "./localNetwork.ts";

const onPage = (protocol: string) =>
  vi.stubGlobal("location", { protocol } as Location);

describe("withLocalNetworkTarget", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("marks http:// requests from an HTTPS page as local", () => {
    onPage("https:");
    expect(
      withLocalNetworkTarget("http://192.168.1.10", { method: "GET" }),
    ).toEqual({ method: "GET", targetAddressSpace: "local" });
  });

  it("leaves https:// requests alone", () => {
    onPage("https:");
    expect(withLocalNetworkTarget("https://meshtastic.local")).toEqual({});
  });

  it("leaves requests from an HTTP page alone", () => {
    onPage("http:");
    expect(withLocalNetworkTarget("http://meshtastic.local")).toEqual({});
  });
});
