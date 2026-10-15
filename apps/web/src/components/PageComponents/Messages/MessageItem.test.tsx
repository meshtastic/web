import {
  type Message,
  MessageState,
  MessageType,
} from "@core/stores/messageStore";
import { Protobuf, type Types } from "@meshtastic/sdk";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MessageItem } from "./MessageItem.tsx";

const MY_NODE = 1;
const PEER = 2;

vi.mock("@core/stores", () => ({
  useAppStore: (selector?: (s: { selectedDeviceId: number }) => unknown) =>
    selector ? selector({ selectedDeviceId: 0 }) : { selectedDeviceId: 0 },
  useDevice: () => ({ config: {} }),
}));

vi.mock("@core/hooks/useNodesAsProto.ts", () => ({
  useMyNodeAsProto: () => ({ num: MY_NODE }),
  useNodeAsProto: (num: number) => ({
    num,
    isFavorite: false,
    user: { longName: num === MY_NODE ? "Me" : "Peer", shortName: "P" },
  }),
}));

vi.mock("@components/UI/Avatar.tsx", () => ({ Avatar: () => null }));

const AckProof = Protobuf.Mesh.MeshPacket_AckProofStatus;

const makeMessage = (overrides: Partial<Message>): Message =>
  ({
    type: MessageType.Direct,
    channel: 0 as Types.ChannelNumber,
    to: PEER,
    from: MY_NODE,
    date: 1_700_000_000_000,
    messageId: 1,
    state: MessageState.Ack,
    message: "hello",
    ...overrides,
  }) as Message;

const renderItem = (message: Message) =>
  render(
    <ul>
      <MessageItem message={message} />
    </ul>,
  );

describe("MessageItem trust indicators", () => {
  it("shows the signed indicator on a signed received message", () => {
    renderItem(makeMessage({ from: PEER, to: MY_NODE, signed: true }));
    expect(
      screen.getByRole("button", { name: "Signed message" }),
    ).toBeInTheDocument();
  });

  it("does not mark an unsigned received message", () => {
    renderItem(makeMessage({ from: PEER, to: MY_NODE, signed: false }));
    expect(
      screen.queryByRole("button", { name: "Signed message" }),
    ).not.toBeInTheDocument();
  });

  it("shows delivery proven for a VALID ack proof", () => {
    renderItem(makeMessage({ ackProof: AckProof.ACK_PROOF_VALID }));
    expect(
      screen.getByRole("button", { name: "Delivery proven" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Forged acknowledgement/),
    ).not.toBeInTheDocument();
  });

  it("warns about a forged ack for an INVALID ack proof", () => {
    renderItem(makeMessage({ ackProof: AckProof.ACK_PROOF_INVALID }));
    expect(screen.getByText(/Forged acknowledgement/)).toBeInTheDocument();
    expect(screen.getByText(/failed its proof check/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delivery proven" }),
    ).not.toBeInTheDocument();
  });

  it.each([AckProof.ACK_PROOF_ABSENT, AckProof.ACK_PROOF_NO_KEY])(
    "shows nothing extra for ack proof %s",
    (ackProof) => {
      renderItem(makeMessage({ ackProof }));
      expect(
        screen.queryByRole("button", { name: "Delivery proven" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Forged acknowledgement/),
      ).not.toBeInTheDocument();
    },
  );
});
