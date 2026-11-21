import { createMemoryDb } from "@core/storage/memoryDb.ts";
import type { ConversationKey } from "@core/storage/types.ts";
import { SqlocalMessageFilterRepository } from "@core/storage/messageFilter.ts";
import { SqlocalMessageRepository } from "@core/storage/messages.ts";
import type { Types } from "@core/protobuf.ts";
import type { SendHandleJs } from "@meshtastic/sdk-kmp";
import { Result } from "better-result";
import { describe, expect, it, vi } from "vitest";
import { ChatClient, type ChatTransport } from "./chat.ts";
import { MessageFilterClient } from "./messageFilter.ts";
import { BROADCAST_NUM } from "./packets.ts";

const ME = 1;
const PEER = 2;
const OTHER_RADIO = 77;
const CHANNEL = { kind: "channel", channel: 0 } as const;
const DM = { kind: "direct", peer: PEER } as const;

function transport(): ChatTransport {
  let next = 1000;
  const handle = (): SendHandleJs => {
    const id = next++;
    return { id, outcome: Promise.resolve({ id, ok: true, reason: null }) };
  };
  return {
    myNodeNum: () => ME,
    sendText: () => handle(),
    sendPacket: () => handle(),
    warn: () => {},
  };
}

const onChannel = (
  id: number,
  data: string,
  from = PEER,
): Types.PacketMetadata<string> => ({
  id,
  rxTime: new Date(id * 1000),
  type: "broadcast",
  from,
  to: BROADCAST_NUM,
  channel: 0,
  data,
});

async function setup() {
  const db = await createMemoryDb();
  const filterRepo = () =>
    new SqlocalMessageFilterRepository(db, { deviceId: ME });
  const open = (filter = new MessageFilterClient(filterRepo())) => ({
    filter,
    chat: new ChatClient(transport(), {
      repository: new SqlocalMessageRepository(db, { deviceId: ME }),
      filter,
    }),
  });
  return { db, open, filterRepo };
}

const texts = (chat: ChatClient, key: ConversationKey = CHANNEL) =>
  chat.thread(key).value.map((t) => t.message.text);

describe("message filter in the chat view model", () => {
  it("hides a matching incoming message but never my own", async () => {
    const { open } = await setup();
    const { chat, filter } = open();
    await filter.setEnabled(true);
    await filter.addWord("spam");

    chat.receive(onChannel(1, "hello"));
    chat.receive(onChannel(2, "buy spam now"));
    chat.receive(onChannel(3, "my spam", ME));

    expect(texts(chat)).toEqual(["hello", "my spam"]);
    expect(chat.filteredCount(CHANNEL).value).toBe(1);
  });

  it("keeps a filtered message out of unread and the preview, across a reload", async () => {
    const { open } = await setup();
    const first = open();
    await first.filter.setEnabled(true);
    await first.filter.addWord("spam");
    first.chat.receive(onChannel(1, "hello"));
    first.chat.receive(onChannel(2, "spam!"));
    expect(first.chat.unread.total.value).toBe(1);
    expect(first.chat.summaries.value.get("channel:0")?.lastMessage?.text).toBe(
      "hello",
    );
    await first.chat.flush();

    const second = open();
    await vi.waitFor(() => expect(second.chat.summaries.value.size).toBe(1));
    expect(second.chat.unread.total.value).toBe(1);
    expect(
      second.chat.summaries.value.get("channel:0")?.lastMessage?.text,
    ).toBe("hello");
  });

  it("applies word changes, the switch and opt-outs to an open thread live", async () => {
    const { open } = await setup();
    const { chat, filter } = open();
    chat.receive(onChannel(1, "hello"));
    chat.receive(onChannel(2, "eggs and ham"));
    const thread = chat.thread(CHANNEL);
    const seen: number[] = [];
    const off = thread.subscribe((v) => seen.push(v.length));

    await filter.addWord("ham");
    expect(texts(chat)).toEqual(["hello", "eggs and ham"]);
    await filter.setEnabled(true);
    expect(texts(chat)).toEqual(["hello"]);
    await filter.setOptedOut(CHANNEL, true);
    expect(texts(chat)).toEqual(["hello", "eggs and ham"]);
    expect(chat.filteredCount(CHANNEL).value).toBe(0);
    await filter.setOptedOut(CHANNEL, false);
    await filter.removeWord("ham");
    expect(texts(chat)).toEqual(["hello", "eggs and ham"]);
    expect(seen).toEqual([1, 2, 1, 2]);
    off();
  });

  it("reveals filtered messages marked, keeping their identity", async () => {
    const { open } = await setup();
    const { chat, filter } = open();
    await filter.setEnabled(true);
    await filter.addWord("spam");
    chat.receive(onChannel(1, "spam"));
    expect(texts(chat)).toEqual([]);

    // A subscriber (the message list) hears the very first change.
    const heard: number[] = [];
    const off = chat.thread(CHANNEL).subscribe((v) => heard.push(v.length));
    const counts: number[] = [];
    const offCount = chat
      .filteredCount(CHANNEL)
      .subscribe((n) => counts.push(n));
    filter.setRevealed(CHANNEL, true);
    expect(heard).toEqual([1]);
    expect(filter.revealed("channel:0").value).toBe(true);
    const [shown] = chat.thread(CHANNEL).value;
    expect(shown?.filtered).toBe(true);
    chat.receive(onChannel(2, "fine"));
    expect(chat.thread(CHANNEL).value[0]).toBe(shown);
    chat.receive(onChannel(3, "more spam"));
    expect(counts).toEqual([2]);
    off();
    offCount();
  });

  it("tells subscribers about the first switch and word change", async () => {
    const filter = new MessageFilterClient(undefined);
    const enabled: boolean[] = [];
    const words: number[] = [];
    const optedOut: boolean[] = [];
    filter.enabled.subscribe((v) => enabled.push(v));
    filter.words.subscribe((v) => words.push(v.length));
    filter.optedOut(CHANNEL).subscribe((v) => optedOut.push(v));
    await filter.setEnabled(true);
    await filter.addWord("spam");
    await filter.setOptedOut(CHANNEL, true);
    expect(enabled).toEqual([true]);
    expect(words).toEqual([1]);
    expect(optedOut).toEqual([true]);
  });

  it("does not filter a conversation that opted out when the message arrived", async () => {
    const { open } = await setup();
    const { chat, filter } = open();
    await filter.setEnabled(true);
    await filter.addWord("spam");
    await filter.setOptedOut(DM, true);
    chat.receive({ ...onChannel(1, "spam"), type: "direct", to: ME });
    expect(chat.unread.total.value).toBe(1);
    expect(texts(chat, DM)).toEqual(["spam"]);
  });
});

describe("MessageFilterClient", () => {
  it("loads what was saved, and each radio has its own", async () => {
    const { db, filterRepo } = await setup();
    const first = new MessageFilterClient(filterRepo());
    await first.setEnabled(true);
    expect(Result.isOk(await first.addWord("  spam "))).toBe(true);

    const reloaded = new MessageFilterClient(filterRepo());
    await vi.waitFor(() => expect(reloaded.words.value).toEqual(["spam"]));
    expect(reloaded.enabled.value).toBe(true);

    reloaded.rescope(OTHER_RADIO);
    expect(reloaded.words.value).toEqual([]);
    await reloaded.addWord("ham");
    const other = new MessageFilterClient(
      new SqlocalMessageFilterRepository(db, { deviceId: OTHER_RADIO }),
    );
    await vi.waitFor(() => expect(other.words.value).toEqual(["ham"]));
    expect(other.enabled.value).toBe(false);
  });

  it("rejects invalid entries without saving them", async () => {
    const { filterRepo } = await setup();
    const filter = new MessageFilterClient(filterRepo());
    await filter.addWord("spam");
    const duplicate = await filter.addWord("spam");
    const invalid = await filter.addWord("regex:(");
    expect(Result.isError(duplicate) && duplicate.error.kind).toBe("duplicate");
    expect(Result.isError(invalid) && invalid.error.kind).toBe("invalidRegex");
    expect(filter.words.value).toEqual(["spam"]);
  });

  it("undoes a change storage refused", async () => {
    const { db, filterRepo } = await setup();
    const filter = new MessageFilterClient(filterRepo());
    await vi.waitFor(() => expect(filter.enabled.value).toBe(false));
    await db.run("DROP TABLE filter_words");
    const added = await filter.addWord("spam");
    expect(Result.isError(added) && added.error.kind).toBe("storage");
    expect(filter.words.value).toEqual([]);
  });

  it("works in memory without storage", async () => {
    const filter = new MessageFilterClient(undefined);
    await filter.addWord("spam");
    await filter.setEnabled(true);
    expect(filter.state.value.matcher.patterns).toHaveLength(1);
  });
});
