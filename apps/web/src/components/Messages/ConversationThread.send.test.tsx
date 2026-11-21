import { create, toBinary } from "@bufbuild/protobuf";
import { FakeKmpClient, state } from "@core/kmp/fakeClient.ts";
import { MeshSession } from "@core/kmp/session.ts";
import { Protobuf } from "@core/protobuf.ts";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConversationThread } from "./ConversationThread.tsx";

// The real chat client behind the real hooks: only the registry lookup and
// the toast are stand-ins.
const env = vi.hoisted(() => {
  const holder: { session?: MeshSession; toast: ReturnType<typeof vi.fn> } = {
    toast: vi.fn(),
  };
  return holder;
});

vi.mock("@core/kmp/hooks/registry.tsx", () => ({
  useActiveClient: () => env.session,
}));

vi.mock("@core/hooks/useToast.ts", () => ({
  useToast: () => ({ toast: env.toast }),
}));

const ME = 1;
const A544 = 0xa544;
const BROADCAST = 0xffffffff;

const connected = (): { kmp: FakeKmpClient; session: MeshSession } => {
  const kmp = new FakeKmpClient();
  const session = new MeshSession(kmp);
  kmp.setState(state("configuring"));
  kmp.emitFrame(
    toBinary(
      Protobuf.Mesh.FromRadioSchema,
      create(Protobuf.Mesh.FromRadioSchema, {
        payloadVariant: {
          case: "myInfo",
          value: create(Protobuf.Mesh.MyNodeInfoSchema, { myNodeNum: ME }),
        },
      }),
    ),
  );
  kmp.setState(state("connected"));
  session.chat.receive({
    id: 10,
    rxTime: new Date(2026, 10, 21, 9, 0),
    type: "broadcast",
    from: A544,
    to: BROADCAST,
    channel: 0,
    data: "Ghuduuogofw",
  });
  return { kmp, session };
};

const renderThread = () =>
  render(
    <ConversationThread
      conversation={{ kind: "channel", channel: 0 }}
      title="Primary"
      hint=""
      destination="broadcast"
      channel={0}
      connected
      traceroutes={[]}
      sender={(nodeNum) => ({ nodeNum, name: "A544", initials: "A5" })}
      nameOf={() => "Meshtastic A544"}
      myNodeNum={ME}
      muted={false}
      touch={false}
      confirmClear={false}
      onConfirmClearChange={vi.fn()}
      onClear={vi.fn()}
    />,
  );

const replyAndSend = async (text: string) => {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Reply" }));
  expect(screen.getByText("Replying to Meshtastic A544")).toBeInTheDocument();
  const field = screen.getByLabelText("Message Primary");
  await user.type(field, `${text}{Enter}`);
  return { user, field };
};

const replyStrip = () => screen.queryByText("Replying to Meshtastic A544");

beforeEach(() => {
  env.toast.mockReset();
  env.session = undefined;
});

describe("ConversationThread reply → send (real chat client)", () => {
  it("clears the reply and composer once the reply goes out", async () => {
    const { kmp, session } = connected();
    env.session = session;
    renderThread();
    const { field } = await replyAndSend("On my way");
    await act(() => session.chat.flush());

    expect(kmp.texts).toMatchObject([
      { text: "On my way", to: BROADCAST, channel: 0, replyId: 10 },
    ]);
    expect(field).toHaveValue("");
    expect(replyStrip()).toBeNull();
    expect(env.toast).not.toHaveBeenCalled();
  });

  it("keeps the reply cleared when the mesh doesn't deliver a sent reply", async () => {
    const { kmp, session } = connected();
    kmp.holdSends = true;
    env.session = session;
    renderThread();
    const { field } = await replyAndSend("On my way");
    expect(replyStrip()).toBeNull();

    // The radio sent it, then gave up waiting for a rebroadcast.
    await act(async () => {
      kmp.settleSends({ ok: false, reason: "MAX_RETRANSMIT" });
    });

    // The message is in the thread, marked undelivered with a retry; the
    // composer isn't handed the same text and reply a second time.
    expect(screen.getByText(/Not delivered/)).toBeInTheDocument();
    expect(field).toHaveValue("");
    expect(replyStrip()).toBeNull();
    expect(env.toast).not.toHaveBeenCalled();
  });

  it("doesn't wipe the composer when a failed message is retried", async () => {
    const { kmp, session } = connected();
    kmp.sendOutcome = { ok: false, reason: "MAX_RETRANSMIT" };
    env.session = session;
    renderThread();
    const { user, field } = await replyAndSend("On my way");
    await act(() => session.chat.flush());
    await user.type(field, "next one");

    kmp.sendOutcome = { ok: true, reason: null };
    const failed = screen.getByText(/Not delivered/).closest("li");
    await user.click(
      within(failed ?? document.body).getByRole("button", { name: /Retry/ }),
    );
    await act(() => session.chat.flush());

    expect(kmp.texts).toHaveLength(2);
    expect(kmp.texts[1]).toMatchObject({ text: "On my way", replyId: 10 });
    expect(field).toHaveValue("next one");
  });

  it("gives the text and reply back when the radio refuses the packet", async () => {
    const { kmp, session } = connected();
    vi.spyOn(kmp, "sendText").mockImplementation(() => {
      throw new Error("not connected");
    });
    env.session = session;
    renderThread();
    const { field } = await replyAndSend("On my way");
    await act(() => Promise.resolve());

    expect(field).toHaveValue("On my way");
    expect(replyStrip()).toBeInTheDocument();
    expect(env.toast).toHaveBeenCalledWith({ title: "Message not sent" });
  });
});
