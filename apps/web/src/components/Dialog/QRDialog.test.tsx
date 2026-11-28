import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { parseChannelUrl } from "@core/utils/channelUrl.ts";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QRDialog } from "./QRDialog.tsx";

const Role = Protobuf.Channel.Channel_Role;
const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;

vi.mock("@core/kmp/hooks", () => ({
  useChannels: () => [
    create(Protobuf.Channel.ChannelSchema, {
      index: 0,
      role: Role.PRIMARY,
      settings: create(Protobuf.Channel.ChannelSettingsSchema, {
        name: "Hikers",
        psk: new Uint8Array([2]),
      }),
    }),
  ],
}));

vi.mock("react-qrcode-logo", () => ({
  QRCode: ({ value }: { value: string }) => <canvas data-value={value} />,
}));

const lora = create(Protobuf.Config.Config_LoRaConfigSchema, {
  usePreset: true,
  region: Region.EU_868,
});

const sharedUrl = () =>
  screen.getByRole("group", { name: "Sharable URL" }).querySelector("code")
    ?.textContent ?? "";

describe("QRDialog", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shares a Replace link with the LoRa settings by default", () => {
    render(<QRDialog open={true} onOpenChange={vi.fn()} loraConfig={lora} />);
    expect(screen.getByRole("radio", { name: "Replace" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    const { add, channelSet } = parseChannelUrl(sharedUrl());
    expect(add).toBe(false);
    expect(channelSet.settings.map((s) => s.name)).toEqual(["Hikers"]);
    expect(channelSet.loraConfig?.region).toBe(Region.EU_868);
  });

  it("shares an Add link without LoRa settings", () => {
    render(<QRDialog open={true} onOpenChange={vi.fn()} loraConfig={lora} />);
    fireEvent.click(screen.getByRole("radio", { name: "Add" }));
    const url = sharedUrl();
    expect(url).toContain("/e/?add=true#");
    expect(
      parseChannelUrl(url.replace("?add=true", "")).channelSet.loraConfig,
    ).toBeUndefined();
    expect(
      screen.getByText(/keeps their channels and LoRa settings/),
    ).toBeInTheDocument();
  });

  it("holds a Replace link until the LoRa settings load", () => {
    render(<QRDialog open={true} onOpenChange={vi.fn()} />);
    expect(
      screen.getByText(/Waiting for this radio's LoRa settings/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Sharable URL" })).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Add" }));
    expect(sharedUrl()).toContain("/e/?add=true#");
  });

  it("offers the system share sheet only where the browser has one", () => {
    const { unmount } = render(
      <QRDialog open={true} onOpenChange={vi.fn()} loraConfig={lora} />,
    );
    expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
    unmount();

    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, share });
    render(<QRDialog open={true} onOpenChange={vi.fn()} loraConfig={lora} />);
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ url: sharedUrl() }),
    );
  });
});
