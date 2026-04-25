import { describe, expect, it } from "vitest";
import { MeshClient } from "../../core/client/MeshClient.ts";
import { createFakeTransport } from "../../core/testing/createFakeTransport.ts";
import { ChannelNumber } from "../../core/types.ts";
import { InMemoryDraftRepository } from "./infrastructure/repositories/InMemoryDraftRepository.ts";

describe("ChatClient drafts", () => {
  it("starts empty and tracks set/clear via the signal", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const conv = { kind: "channel" as const, channel: ChannelNumber.Primary };
    expect(client.chat.drafts.get(conv).value).toBe("");

    client.chat.drafts.set(conv, "wip text");
    expect(client.chat.drafts.get(conv).value).toBe("wip text");

    client.chat.drafts.clear(conv);
    expect(client.chat.drafts.get(conv).value).toBe("");
  });

  it("hydrates from the repository on first read", async () => {
    const draftRepository = new InMemoryDraftRepository();
    await draftRepository.save({ kind: "direct", peer: 42 }, "from disk");

    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport, chat: { draftRepository } });
    const sig = client.chat.drafts.get({ kind: "direct", peer: 42 });
    expect(sig.value).toBe("");

    await new Promise((r) => setTimeout(r, 10));
    expect(sig.value).toBe("from disk");
  });

  it("persists draft writes to the repository", async () => {
    const draftRepository = new InMemoryDraftRepository();
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport, chat: { draftRepository } });

    client.chat.drafts.set({ kind: "channel", channel: ChannelNumber.Primary }, "hello");
    await new Promise((r) => setTimeout(r, 5));
    expect(await draftRepository.load({ kind: "channel", channel: ChannelNumber.Primary })).toBe(
      "hello",
    );
  });
});
