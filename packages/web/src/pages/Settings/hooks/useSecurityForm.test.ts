import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSecurityForm } from "./useSecurityForm";
import { useDevice } from "@core/stores";
import { useFieldRegistry } from "@core/services/fieldRegistry";
import { getX25519PrivateKey, getX25519PublicKey } from "@core/utils/x25519";
import { fromByteArray } from "base64-js";

vi.mock("@core/stores", () => ({
  useDevice: vi.fn(),
}));

vi.mock("@core/services/fieldRegistry", () => ({
  useFieldRegistry: vi.fn(),
}));

vi.mock("@core/utils/x25519", () => ({
  getX25519PrivateKey: vi.fn(),
  getX25519PublicKey: vi.fn(),
}));

vi.mock("@app/validation/config/security", () => ({
  RawSecuritySchema: { parse: vi.fn(), safeParse: vi.fn().mockReturnValue({ success: true }) },
}));

// Mock resolver
vi.mock("@components/Form/createZodResolver", () => ({
  createZodResolver: vi.fn(() => async (data: any) => ({ values: data, errors: {} })),
}));

describe("useSecurityForm", () => {
  const mockSetChange = vi.fn();
  const mockTrackChange = vi.fn();
  const mockRemoveChange = vi.fn();

  const mockKeys = new Uint8Array([1, 2, 3]);
  const mockBase64 = fromByteArray(mockKeys);

  beforeEach(() => {
    vi.clearAllMocks();

    (useDevice as vi.Mock).mockReturnValue({
      config: { security: { privateKey: mockKeys, publicKey: mockKeys, adminKey: [] } },
      getEffectiveConfig: vi.fn().mockReturnValue({ privateKey: mockKeys, publicKey: mockKeys, adminKey: [] }),
      setChange: mockSetChange,
    });

    (useFieldRegistry as vi.Mock).mockReturnValue({
      trackChange: mockTrackChange,
      removeChange: mockRemoveChange,
    });

    (getX25519PrivateKey as vi.Mock).mockReturnValue(new Uint8Array([4, 5, 6]));
    (getX25519PublicKey as vi.Mock).mockReturnValue(new Uint8Array([7, 8, 9]));
  });

  it("should initialize form", () => {
    const { result } = renderHook(() => useSecurityForm());
    expect(result.current.isReady).toBe(true);
    expect(result.current.form.getValues("privateKey")).toBe(mockBase64);
  });

  it("should regenerate keys", async () => {
    const { result } = renderHook(() => useSecurityForm());

    await act(async () => {
        result.current.regenerateKeys();
    });

    const priv = result.current.form.getValues("privateKey");
    const pub = result.current.form.getValues("publicKey");

    expect(priv).toBe(fromByteArray(new Uint8Array([4, 5, 6])));
    expect(pub).toBe(fromByteArray(new Uint8Array([7, 8, 9])));
  });
});
