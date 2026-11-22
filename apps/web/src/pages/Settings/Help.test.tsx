import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Help } from "./Help.tsx";

const navigate = vi.fn();

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
});
