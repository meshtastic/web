import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MessagesPage } from "./Messages.tsx";
import { useDevice } from "../core/stores/deviceStore.ts";
import { Protobuf } from "@meshtastic/core";

vi.mock("../core/stores/deviceStore", () => ({
  useDevice: vi.fn(),
}));

const mockUseDevice = {
  channels: new Map([
    [0, {
      index: 0,
      settings: { name: "Primary" },
      role: Protobuf.Channel.Channel_Role.PRIMARY,
    }],
  ]),
  nodes: new Map([
    [0, {
      num: 0,
      user: { longName: "Test Node 0", shortName: "TN0", publicKey: "0000" },
    }],
    [1111, {
      num: 1111,
      user: { longName: "Test Node 1", shortName: "TN1", publicKey: "12345" },
    }],
    [2222, {
      num: 2222,
      user: { longName: "Test Node 2", shortName: "TN2", publicKey: "67890" },
    }],
    [3333, {
      num: 3333,
      user: { longName: "Test Node 3", shortName: "TN3", publicKey: "11111" },
    }],
  ]),
  hardware: { myNodeNum: 1 },
  messages: { broadcast: new Map(), direct: new Map() },
  metadata: new Map(),
  unreadCounts: new Map([[1111, 3], [2222, 10]]),
  resetUnread: vi.fn(),
  hasNodeError: vi.fn(),
};

describe.skip("Messages Page", () => {
  beforeEach(() => {
    vi.mocked(useDevice).mockReturnValue(mockUseDevice);
  });

  it("sorts unreads to the top", () => {
    render(<MessagesPage />);
    const buttonOrder = screen.getAllByRole("button").filter((b) =>
      b.textContent.includes("Test Node")
    );
    expect(buttonOrder[0].textContent).toContain("TN2Test Node 210");
    expect(buttonOrder[1].textContent).toContain("TN1Test Node 13");
    expect(buttonOrder[2].textContent).toContain("TN0Test Node 0");
    expect(buttonOrder[3].textContent).toContain("TN3Test Node 3");
  });

  it("updates unread when active chat changes", () => {
    render(<MessagesPage />);
    const nodeButton =
      screen.getAllByRole("button").filter((b) =>
        b.textContent.includes("TN1Test Node 13")
      )[0];
    fireEvent.click(nodeButton);
    expect(mockUseDevice.resetUnread).toHaveBeenCalledWith(1111, 0);
  });

  it("does not update the incorrect node", () => {
    render(<MessagesPage />);
    const nodeButton =
      screen.getAllByRole("button").filter((b) =>
        b.textContent.includes("TN1Test Node 1")
      )[0];
    fireEvent.click(nodeButton);
    expect(mockUseDevice.resetUnread).toHaveBeenCalledWith(1111, 0);
    expect(mockUseDevice.unreadCounts.get(2222)).toBe(10);
  });
});
