import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  EXISTING_CHANNEL_PSK_STATE,
  NEW_CHANNEL_PSK_STATE,
} from "./channelStaging.ts";
import { EditChannelDialog } from "./EditChannelDialog.tsx";

const channel = create(Protobuf.Channel.ChannelSchema, {
  index: 1,
  role: Protobuf.Channel.Channel_Role.SECONDARY,
  settings: {
    ...create(Protobuf.Channel.ChannelSettingsSchema),
    name: "Friends",
    psk: new Uint8Array(16).fill(3),
    useAead: true,
    id: 42,
    moduleSettings: {
      ...create(Protobuf.Channel.ModuleSettingsSchema),
      positionPrecision: 32,
      isMuted: true,
    },
  },
});

function renderDialog(
  props: Partial<Parameters<typeof EditChannelDialog>[0]> = {},
) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <EditChannelDialog
      channel={channel}
      isNew={false}
      initialPskState={EXISTING_CHANNEL_PSK_STATE}
      defaultName="Ch 1"
      metric
      onSave={onSave}
      onClose={onClose}
      {...props}
    />,
  );
  return { onSave, onClose };
}

describe("EditChannelDialog", () => {
  it("stages the edit on OK and keeps fields it doesn't show", () => {
    const { onSave } = renderDialog();
    fireEvent.change(screen.getByLabelText("Channel Name"), {
      target: { value: "Family" },
    });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0]?.[0] as Protobuf.Channel.Channel;
    expect(saved.settings?.name).toBe("Family");
    expect(saved.settings?.useAead).toBe(true);
    expect(saved.settings?.id).toBe(42);
    expect(saved.settings?.moduleSettings?.isMuted).toBe(true);
    expect(saved.settings?.psk).toEqual(new Uint8Array(16).fill(3));
  });

  it("discards edits on Cancel", () => {
    const { onSave, onClose } = renderDialog();
    fireEvent.change(screen.getByLabelText("Channel Name"), {
      target: { value: "Family" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("blocks OK while the name is longer than 11 bytes", () => {
    const { onSave } = renderDialog();
    fireEvent.change(screen.getByLabelText("Channel Name"), {
      target: { value: "a".repeat(12) },
    });
    const ok = screen.getByRole("button", { name: "OK" });
    expect(ok).toBeDisabled();
    fireEvent.click(ok);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("does not offer Authenticated Encryption", () => {
    renderDialog();
    expect(screen.queryByText(/Authenticated Encryption/)).toBeNull();
  });

  it("shows the precision slider only when precise location is off", () => {
    renderDialog();
    expect(screen.queryByText("Location precision")).toBeNull();
    fireEvent.click(screen.getByLabelText("Precise location"));
    expect(screen.getByText("Location precision")).toBeInTheDocument();
    expect(screen.getByText("Within 2.9 kilometers")).toBeInTheDocument();
  });

  it("generates a key when a new channel with the default key is named", () => {
    const fresh = create(Protobuf.Channel.ChannelSchema, {
      index: 2,
      role: Protobuf.Channel.Channel_Role.SECONDARY,
      settings: {
        ...create(Protobuf.Channel.ChannelSettingsSchema),
        psk: new Uint8Array([1]),
      },
    });
    const { onSave } = renderDialog({
      channel: fresh,
      isNew: true,
      initialPskState: NEW_CHANNEL_PSK_STATE,
    });
    fireEvent.change(screen.getByLabelText("Channel Name"), {
      target: { value: "Hiking" },
    });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    const saved = onSave.mock.calls[0]?.[0] as Protobuf.Channel.Channel;
    expect(saved.settings?.psk.length).toBe(32);
    expect(saved.role).toBe(Protobuf.Channel.Channel_Role.SECONDARY);
  });
});
