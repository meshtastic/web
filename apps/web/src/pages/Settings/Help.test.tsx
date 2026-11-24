import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Help } from "./Help.tsx";

const navigate = vi.fn();
const download = vi.hoisted(() => vi.fn());

vi.mock("./radioInfo.ts", () => ({
  useRadioInfo: () => ({ firmware: "2.8.2.1a2b3c4", hardware: "HELTEC_V3" }),
}));

vi.mock("@core/hooks/useNodesAsProto.ts", () => ({
  useNodesAsProto: () => [{}, {}, {}],
}));

vi.mock("@core/utils/downloadText.ts", () => ({
  downloadTextFile: download,
}));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navigate,
}));

describe("Help", () => {
  it("replays the welcome walkthrough", async () => {
    const user = userEvent.setup();
    render(<Help onFormInit={vi.fn()} />);
    expect(screen.getByText("Replay the welcome walkthrough")).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Start/ }));
    expect(navigate).toHaveBeenCalledWith({ to: "/welcome" });
  });

  it("downloads diagnostics that name the connected radio", async () => {
    const user = userEvent.setup();
    render(<Help onFormInit={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /Download/ }));
    expect(download).toHaveBeenCalledWith(
      expect.stringMatching(/^meshtastic-diagnostics-/),
      expect.stringContaining(
        "Radio: firmware 2.8.2.1a2b3c4, hardware HELTEC_V3, 3 nodes",
      ),
    );
  });
});
