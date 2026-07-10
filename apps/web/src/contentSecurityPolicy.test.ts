import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "./contentSecurityPolicy.ts";

describe("content security policy", () => {
  it("allows WebAssembly compilation without allowing JavaScript eval", () => {
    expect(contentSecurityPolicy).toContain("'wasm-unsafe-eval'");
    expect(contentSecurityPolicy).not.toContain("'unsafe-eval'");
  });
});
