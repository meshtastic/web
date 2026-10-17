import {
  type Message,
  MessageState,
  MessageType,
} from "@core/stores/messageStore";
import { Protobuf, type Types } from "@meshtastic/sdk";
import { fireEvent, render, screen } from "@testing-library/react";
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

const resend = vi.fn(() => Promise.resolve({ status: "ok", value: 2 }));
vi.mock("@meshtastic/sdk-react", () => ({
  useActiveClient: () => ({ chat: { resend } }),
}));

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

  it("shows the recipient's proven delivery in the status line", () => {
    renderItem(makeMessage({ ackProof: AckProof.ACK_PROOF_VALID }));
    expect(
      screen.getByRole("button", {
        name: /Delivered to recipient · proven/,
      }),
    ).toBeInTheDocument();
  });

  it("puts a forged ack in the status line instead of delivered", () => {
    renderItem(makeMessage({ ackProof: AckProof.ACK_PROOF_INVALID }));
    expect(
      screen.getByRole("button", { name: /Delivery proof failed/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Delivered to recipient"),
    ).not.toBeInTheDocument();
  });

  it.each([AckProof.ACK_PROOF_ABSENT, AckProof.ACK_PROOF_NO_KEY])(
    "shows plain delivery for ack proof %s",
    (ackProof) => {
      renderItem(makeMessage({ ackProof }));
      expect(screen.getByText("Delivered to recipient")).toBeInTheDocument();
    },
  );
});

describe("MessageItem delivery status", () => {
  it("shows a direct message that was only relayed as unconfirmed", () => {
    renderItem(makeMessage({ state: MessageState.Delivered }));
    expect(
      screen.getByText("Relayed, not confirmed by recipient"),
    ).toBeInTheDocument();
  });

  it("shows a broadcast acked by the mesh as delivered", () => {
    renderItem(
      makeMessage({
        type: MessageType.Broadcast,
        to: 0xffffffff,
        state: MessageState.Delivered,
      }),
    );
    expect(screen.getByText("Delivered to mesh")).toBeInTheDocument();
  });

  it("names the failure, explains it, and offers resend", () => {
    renderItem(
      makeMessage({
        state: MessageState.Failed,
        routingError: Protobuf.Mesh.Routing_Error.MAX_RETRANSMIT,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Failed to deliver to mesh/ }),
    );
    expect(
      screen.getByText(/No node confirmed this message/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resend" }));
    expect(resend).toHaveBeenCalledWith({
      id: 1,
      text: "hello",
      to: PEER,
      channel: 0,
      type: "direct",
    });
  });

  it("does not show a status on received messages", () => {
    renderItem(makeMessage({ from: PEER, to: MY_NODE }));
    expect(
      screen.queryByText("Delivered to recipient"),
    ).not.toBeInTheDocument();
  });
});

describe("MessageItem mesh diagnostics", () => {
  const Transport = Protobuf.Mesh.MeshPacket_TransportMechanism;
  const received = (overrides: Partial<Message>) =>
    makeMessage({ from: PEER, to: MY_NODE, ...overrides });

  it("shows SNR and RSSI for a message heard straight from the sender", () => {
    renderItem(
      received({
        hopsAway: 0,
        snr: 0,
        rssi: -98,
        transport: Transport.TRANSPORT_LORA,
      }),
    );
    expect(screen.getByText("SNR 0.00 dB")).toBeInTheDocument();
    expect(screen.getByText("RSSI -98 dBm")).toBeInTheDocument();
    expect(screen.queryByText("0 hops away")).not.toBeInTheDocument();
  });

  it("shows the hop count instead of signal for a relayed message", () => {
    renderItem(received({ hopsAway: 2, snr: 4.5, rssi: -80 }));
    expect(screen.getByText("2 hops away")).toBeInTheDocument();
    expect(screen.queryByText(/SNR/)).not.toBeInTheDocument();
  });

  it("marks an MQTT message and shows its hops, not signal", () => {
    renderItem(
      received({
        hopsAway: 0,
        snr: 6,
        rssi: -60,
        viaMqtt: true,
        transport: Transport.TRANSPORT_MQTT,
      }),
    );
    expect(
      screen.getByRole("button", { name: "Via MQTT" }),
    ).toBeInTheDocument();
    expect(screen.getByText("0 hops away")).toBeInTheDocument();
    expect(screen.queryByText(/SNR/)).not.toBeInTheDocument();
  });

  it("says when the hop count is unknown", () => {
    renderItem(received({}));
    expect(screen.getByText("Hop count unknown")).toBeInTheDocument();
  });

  it("does not badge LoRa or an unset transport", () => {
    renderItem(
      received({ hopsAway: 1, transport: Transport.TRANSPORT_INTERNAL }),
    );
    expect(
      screen.queryByRole("button", { name: /^Via / }),
    ).not.toBeInTheDocument();
  });

  it("does not show diagnostics on messages we sent", () => {
    renderItem(makeMessage({ hopsAway: 0, snr: 5, rssi: -70 }));
    expect(screen.queryByText(/SNR/)).not.toBeInTheDocument();
    expect(screen.queryByText(/hop/)).not.toBeInTheDocument();
  });
});
