import { type Message, MessageState } from "@core/storage/types.ts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeliveryDetailsDialog } from "./DeliveryDetailsDialog.tsx";

const message = (extra: Partial<Message> = {}): Message => ({
  id: 1,
  from: 7,
  to: 0xffffffff,
  channel: 0,
  rxTime: new Date(0),
  type: "broadcast",
  text: "hi",
  state: MessageState.Ack,
  ...extra,
});

describe("DeliveryDetailsDialog relay", () => {
  it("names the relay of a received message, without a delivery status", () => {
    render(
      <DeliveryDetailsDialog
        message={message({ relayNode: 0x5a, hopsAway: 2 })}
        outgoing={false}
        relay="Ridge (0x5A)"
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Relayed by Ridge (0x5A)",
    );
    expect(screen.getByText("Delivery details")).toBeInTheDocument();
    expect(screen.queryByText("Delivered to mesh")).not.toBeInTheDocument();
    expect(screen.queryByText("Resend")).not.toBeInTheDocument();
  });

  it("names the relay of a sent channel message's ack", () => {
    render(
      <DeliveryDetailsDialog
        message={message({
          from: 1,
          state: MessageState.Delivered,
          relays: 2,
          relayNode: 0x5a,
        })}
        relay="0x5A"
        onOpenChange={vi.fn()}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Acknowledged by 2 nodes");
    expect(dialog).toHaveTextContent("Relayed by 0x5A");
  });

  it("calls a sent direct message's relay the ack's", () => {
    render(
      <DeliveryDetailsDialog
        message={message({
          from: 1,
          to: 7,
          type: "direct",
          state: MessageState.Ack,
          relayNode: 0x5a,
        })}
        relay="Ridge (0x5A)"
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Ack relayed by Ridge (0x5A)",
    );
  });

  it("shows no relay line when none was recorded", () => {
    render(
      <DeliveryDetailsDialog
        message={message({ from: 1, state: MessageState.Delivered })}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog")).not.toHaveTextContent(/relayed by/i);
  });
});
