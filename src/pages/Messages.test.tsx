import { describe, it, vi, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MessagesPage } from "./Messages.tsx";
import { useDevice } from "../core/stores/deviceStore";
import { Protobuf } from "@meshtastic/core";

// Mock the store
vi.mock("../core/stores/deviceStore", () => ({
  useDevice: vi.fn()
}));

const mockUseDevice = {
    channels: new Map([
        [0, {
            index: 0,
            settings: { name: "Primary" },
            role: Protobuf.Channel.Channel_Role.PRIMARY
        }]
    ]),
    nodes: new Map([
        [1111, {
            num: 1111,
            user: { longName: "Test Node", shortName: "TN", publicKey: "12345" }
        }],
        [2222, {
            num: 2222,
            user: { longName: "Test Node 2", shortName: "TN2", publicKey: "67890" }
        }],
        [3333, {
            num: 3333,
            user: { longName: "Test Node 3", shortName: "TN3", publicKey: "11111" }
        }]
    ]),
    hardware: { myNodeNum: 1 },
    messages: { broadcast: new Map(), direct: new Map() },
    metadata: new Map(),
    unreadCounts: new Map([[1111, 3], [2222, 10]]),
    setUnread: vi.fn()
};


describe("Messages Page", () => {
    beforeEach(() => {
        vi.mocked(useDevice).mockReturnValue(mockUseDevice);
    });

    it("shows unread count correctly", () => {
        render(<MessagesPage />);
        const unreadCount = screen.getByText("3");
        expect(unreadCount).toBeInTheDocument();
    });

    it("updates unread when active chat changes",() => {
        render(<MessagesPage />);
        const nodeButton = screen.getByRole("button", { name: "TN Test Node 3" });
        fireEvent.click(nodeButton);

        expect(mockUseDevice.setUnread).toHaveBeenCalledWith(1111, 0);
        expect(mockUseDevice.unreadCounts.get(1111)).toBe(0);
        const unreadCount = screen.getByText("3");
        expect(unreadCount).not.toBeInTheDocument();
    });

    it("does not update the incorrect node",() => {
        render(<MessagesPage />);
        const nodeButton = screen.getByRole("button", { name: "TN Test Node 3" });
        fireEvent.click(nodeButton);

        expect(mockUseDevice.setUnread).toHaveBeenCalledWith(1111, 0);
        expect(mockUseDevice.unreadCounts.get(2222)).toBe(10);
        const unreadCount = screen.getByText("10");
        expect(unreadCount).toBeInTheDocument();
    });

    it("sorts unreads to the top", () => {
        const container = render(<MessagesPage />);
        const buttonOrder = screen.getAllByRole("button")
    });
});