import { Result } from "better-result";
import { describe, expect, it, vi } from "vitest";
import { EmptyMessageError, MessageTooLongError, sendText } from "./SendTextUseCase.ts";
import type { MeshClient } from "../../../core/client/MeshClient.ts";

function makeClient(sendPacket = vi.fn().mockResolvedValue(123)) {
  return {
    log: { debug: vi.fn() },
    sendPacket,
  } as unknown as MeshClient;
}

describe("sendText", () => {
  it("rejects empty text with EmptyMessageError", async () => {
    const client = makeClient();
    const result = await sendText(client, { text: "" });
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toBeInstanceOf(EmptyMessageError);
    }
  });

  it("rejects text that encodes to more than 228 bytes", async () => {
    const client = makeClient();
    const tooLong = "a".repeat(300);
    const result = await sendText(client, { text: tooLong });
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toBeInstanceOf(MessageTooLongError);
    }
  });

  it("encodes text and forwards to sendPacket on the TEXT_MESSAGE_APP portnum", async () => {
    const sendPacket = vi.fn().mockResolvedValue(999);
    const client = makeClient(sendPacket);
    const result = await sendText(client, { text: "hi" });
    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toBe(999);
    }
    expect(sendPacket).toHaveBeenCalledTimes(1);
    const args = sendPacket.mock.calls[0] ?? [];
    const payload = args[0] as Uint8Array;
    expect(new TextDecoder().decode(payload)).toBe("hi");
  });
});
