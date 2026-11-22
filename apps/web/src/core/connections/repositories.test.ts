import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import type { SdkStorage } from "@meshtastic/sdk-kmp";
import type { RunAtomically } from "@core/storage/adopt.ts";
import { createMemoryDb, createMemoryStorage } from "@core/storage/memoryDb.ts";
import { SqlocalDraftRepository } from "@core/storage/drafts.ts";
import { SqlocalMessageRepository } from "@core/storage/messages.ts";
import { SqlocalNodesRepository } from "@core/storage/nodes.ts";
import { StorageScope } from "@core/storage/scope.ts";
import { SqlocalTelemetryRepository } from "@core/storage/telemetry.ts";
import type { Message } from "@core/storage/types.ts";
import { MessageState } from "@core/storage/types.ts";
import { Result } from "better-result";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openRepositories, radioStorage } from "./repositories.ts";

const storage = vi.hoisted(
  (): {
    open?: () => Promise<{
      db: unknown;
      persistent: boolean;
      atomic?: RunAtomically;
    }>;
  } => ({}),
);

const sdk = vi.hoisted(
  (): {
    storage?: SdkStorage;
    reject?: Error;
    hang?: boolean;
    reset: ReturnType<typeof vi.fn>;
  } => ({ reset: vi.fn() }),
);

vi.mock("@core/kmp/browserStorage.ts", () => ({
  getSdkStorage: async () => {
    if (sdk.hang) return new Promise<SdkStorage>(() => {});
    if (sdk.reject) throw sdk.reject;
    if (!sdk.storage) throw new Error("unscripted");
    return sdk.storage;
  },
  resetSdkStorage: sdk.reset,
}));

vi.mock("@core/sdkStorage.ts", () => ({
  getStorageDb: () => {
    if (!storage.open) throw new Error("unscripted");
    return storage.open();
  },
  coordinator: undefined,
}));

const sentinel: SdkStorage = Object.freeze({});

describe("openRepositories", () => {
  beforeEach(() => {
    sdk.storage = sentinel;
    sdk.reject = undefined;
    sdk.hang = false;
    sdk.reset.mockClear();
  });

  it("runs the SDK in memory, and forgets the stuck storage, when it hangs", async () => {
    vi.useFakeTimers();
    const db = await createMemoryDb();
    storage.open = async () => ({ db, persistent: true });
    sdk.hang = true;

    const pending = openRepositories();
    await vi.advanceTimersByTimeAsync(5_000);
    const opened = await pending;

    expect(opened.sdkStorage).toBeUndefined();
    expect(opened.persistent).toBe(true);
    // The next connect starts afresh rather than awaiting the same promise.
    expect(sdk.reset).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("hands the SDK its own storage next to the repositories", async () => {
    const db = await createMemoryDb();
    storage.open = async () => ({ db, persistent: true });

    const opened = await openRepositories();

    expect(opened.persistent).toBe(true);
    expect(opened.sdkStorage).toBe(sentinel);
    expect(opened.options.messages).toBeDefined();
    expect(opened.radio?.scope.provisional).toBe(true);
  });

  it("gives every connect a provisional scope of its own", async () => {
    const db = await createMemoryDb();
    storage.open = async () => ({ db, persistent: true });

    const a = await openRepositories();
    const b = await openRepositories();

    expect(a.radio?.scope.deviceId).toBeLessThan(0);
    expect(b.radio?.scope.deviceId).toBeLessThan(0);
    expect(a.radio?.scope.deviceId).not.toBe(b.radio?.scope.deviceId);
  });

  it("hands the SDK its own storage even when sqlocal is unavailable", async () => {
    storage.open = async () => {
      throw new Error("OPFS unavailable");
    };

    const opened = await openRepositories();

    expect(opened.persistent).toBe(false);
    expect(opened.options).toEqual({});
    expect(opened.sdkStorage).toBe(sentinel);
  });

  it("leaves the SDK in memory when its own storage cannot be created", async () => {
    const db = await createMemoryDb();
    storage.open = async () => ({ db, persistent: true });
    sdk.reject = new Error("no worker");

    const opened = await openRepositories();

    expect(opened.persistent).toBe(true);
    expect(opened.sdkStorage).toBeUndefined();
  });

  it("hands the SDK its storage when sqlocal hangs past the timeout", async () => {
    vi.useFakeTimers();
    storage.open = () => new Promise(() => {});

    const pending = openRepositories();
    await vi.advanceTimersByTimeAsync(5_000);
    const opened = await pending;

    expect(opened.persistent).toBe(false);
    expect(opened.sdkStorage).toBe(sentinel);
  });
});

const RADIO = 0x0a0b0c0d;
const OTHER_RADIO = 0x01020304;
const PEER = 0x11223344;
const CHANNEL_0 = { kind: "channel", channel: 0 } as const;

const message = (id: number, text: string, rxTime = Date.now()): Message => ({
  id,
  from: PEER,
  to: 0xffffffff,
  channel: 0,
  rxTime: new Date(rxTime),
  type: "broadcast",
  text,
  state: MessageState.Ack,
});

async function repositories(scope: StorageScope | number) {
  const { db, atomic } = await createMemoryStorage();
  const repos = (s: StorageScope | number) => {
    const options = typeof s === "number" ? { deviceId: s } : { scope: s };
    return {
      messages: new SqlocalMessageRepository(db, options),
      drafts: new SqlocalDraftRepository(db, options),
      nodes: new SqlocalNodesRepository(db, options),
      telemetry: new SqlocalTelemetryRepository(db, options),
    };
  };
  return { db, atomic, repos, mine: repos(scope) };
}

describe("radioStorage", () => {
  it("files a connection's provisional rows under the radio it names", async () => {
    const scope = new StorageScope(-7);
    const { atomic, repos, mine } = await repositories(scope);
    await mine.messages.append(message(1, "early"));
    await mine.messages.addReaction(
      {
        targetId: 1,
        fromNode: PEER,
        emoji: "👍",
        packetId: 2,
        to: 0xffffffff,
        rxTime: new Date(),
        state: MessageState.Ack,
      },
      CHANNEL_0,
    );
    await mine.messages.markRead(CHANNEL_0);
    await mine.drafts.save(CHANNEL_0, "typed early");
    await mine.nodes.upsert({ num: PEER, isFavorite: true, isIgnored: false });
    await mine.telemetry.append({
      nodeNum: PEER,
      time: new Date(),
      kind: "deviceMetrics",
      value: create(Protobuf.Telemetry.DeviceMetricsSchema, {
        batteryLevel: 50,
      }),
    });

    const adopted = await radioStorage(scope, atomic).identify(RADIO);

    expect(Result.isOk(adopted)).toBe(true);
    expect(scope.deviceId).toBe(RADIO);
    const radio = repos(RADIO);
    expect(
      (await radio.messages.loadRecent(CHANNEL_0, 10)).map((m) => m.text),
    ).toEqual(["early"]);
    expect(await radio.messages.loadReactions([1])).toHaveLength(1);
    expect(
      (await radio.messages.loadConversations(RADIO)).map((c) => c.unread),
    ).toEqual([0]);
    expect(await radio.drafts.load(CHANNEL_0)).toBe("typed early");
    expect((await radio.nodes.get(PEER))?.isFavorite).toBe(true);
    expect(await radio.telemetry.loadRecent(PEER, 10)).toHaveLength(1);
    const leftover = repos(-7);
    expect(await leftover.messages.loadRecent(CHANNEL_0, 10)).toEqual([]);
    expect(await leftover.nodes.loadAll()).toEqual([]);
  });

  it("leaves other radios and other connections' provisional rows alone", async () => {
    const scope = new StorageScope(-7);
    const { atomic, repos, mine } = await repositories(scope);
    await mine.messages.append(message(1, "mine"));
    await repos(-8).messages.append(message(2, "another connection's"));
    await repos(OTHER_RADIO).messages.append(message(3, "other radio's"));
    await repos(OTHER_RADIO).drafts.save(CHANNEL_0, "other draft");

    await radioStorage(scope, atomic).identify(RADIO);

    const texts = async (deviceId: number) =>
      (await repos(deviceId).messages.loadRecent(CHANNEL_0, 10)).map(
        (m) => m.text,
      );
    expect(await texts(RADIO)).toEqual(["mine"]);
    expect(await texts(-8)).toEqual(["another connection's"]);
    expect(await texts(OTHER_RADIO)).toEqual(["other radio's"]);
    expect(await repos(OTHER_RADIO).drafts.load(CHANNEL_0)).toBe("other draft");
  });

  it("merges into history the radio already has", async () => {
    const scope = new StorageScope(-7);
    const { atomic, repos, mine } = await repositories(scope);
    const radio = repos(RADIO);
    await radio.messages.append(message(1, "stored", Date.now() - 1000));
    await radio.drafts.save(CHANNEL_0, "old draft");
    await radio.nodes.upsert({
      num: PEER,
      isFavorite: true,
      isIgnored: false,
      user: create(Protobuf.Mesh.UserSchema, { longName: "Peer" }),
    });
    // The same packet heard again, and something new.
    await mine.messages.append(message(1, "stored", Date.now() - 1000));
    await mine.messages.append(message(2, "new"));
    await mine.messages.markRead(CHANNEL_0);
    await mine.drafts.save(CHANNEL_0, "new draft");
    // Heard before the node DB arrived: flags at their defaults.
    await mine.nodes.upsert({
      num: PEER,
      isFavorite: false,
      isIgnored: false,
      lastHeard: 1234,
    });

    const adopted = await radioStorage(scope, atomic).identify(RADIO);

    expect(Result.isOk(adopted)).toBe(true);
    expect(
      (await radio.messages.loadRecent(CHANNEL_0, 10)).map((m) => m.text),
    ).toEqual(["stored", "new"]);
    expect(
      (await radio.messages.loadConversations(RADIO)).map((c) => c.unread),
    ).toEqual([0]);
    expect(await radio.drafts.load(CHANNEL_0)).toBe("new draft");
    const peer = await radio.nodes.get(PEER);
    expect(peer?.lastHeard).toBe(1234);
    // What this connection never learned keeps the stored value.
    expect(peer?.isFavorite).toBe(true);
    expect(peer?.user?.longName).toBe("Peer");
  });

  it("runs calls made after naming the radio once the rows have moved", async () => {
    const scope = new StorageScope(-7);
    const { atomic, mine } = await repositories(scope);
    await mine.messages.append(message(1, "early"));
    // A slow transaction, as a worker round trip can be.
    const slow: RunAtomically = async (statements) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      await atomic(statements);
    };
    const radio = radioStorage(scope, slow);

    // Not awaited: the reload after naming the radio runs straight away.
    void radio.identify(RADIO);
    const read = mine.messages.loadRecent(CHANNEL_0, 10);
    // A write made meanwhile lands under the radio too.
    const meanwhile = mine.messages.append(message(2, "meanwhile"));

    expect((await read).map((m) => m.text)).toEqual(["early"]);
    await meanwhile;
    expect(
      (await mine.messages.loadRecent(CHANNEL_0, 10)).map((m) => m.text),
    ).toEqual(["early", "meanwhile"]);
    expect(scope.deviceId).toBe(RADIO);
  });

  it("only switches scope when the session reaches another radio later", async () => {
    const scope = new StorageScope(-7);
    const { atomic, repos, mine } = await repositories(scope);
    const radio = radioStorage(scope, atomic);
    await radio.identify(RADIO);
    await mine.messages.append(message(1, "first radio's"));

    await radio.identify(OTHER_RADIO);
    await mine.messages.append(message(2, "second radio's"));

    const texts = async (deviceId: number) =>
      (await repos(deviceId).messages.loadRecent(CHANNEL_0, 10)).map(
        (m) => m.text,
      );
    expect(await texts(RADIO)).toEqual(["first radio's"]);
    expect(await texts(OTHER_RADIO)).toEqual(["second radio's"]);
  });

  it("discards what a connection wrote if it never named its radio", async () => {
    const scope = new StorageScope(-7);
    const { atomic, repos, mine } = await repositories(scope);
    await mine.messages.append(message(1, "nobody's"));
    await repos(-8).messages.append(message(2, "another connection's"));

    await radioStorage(scope, atomic).discard();

    expect(await repos(-7).messages.loadRecent(CHANNEL_0, 10)).toEqual([]);
    expect(await repos(-8).messages.loadRecent(CHANNEL_0, 10)).toHaveLength(1);
  });

  it("keeps the radio's rows when discard comes after naming it", async () => {
    const scope = new StorageScope(-7);
    const { atomic, mine } = await repositories(scope);
    await mine.messages.append(message(1, "kept"));
    const radio = radioStorage(scope, atomic);
    await radio.identify(RADIO);

    await radio.discard();

    expect(await mine.messages.loadRecent(CHANNEL_0, 10)).toHaveLength(1);
  });
});
