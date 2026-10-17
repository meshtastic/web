import { toNodeInfo } from "@core/hooks/useNodesAsProto.ts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NodeDetail } from "./NodeDetail.tsx";

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@components/UI/Avatar.tsx", () => ({ Avatar: () => null }));

describe("NodeDetail popup", () => {
  it("shows the status message and trust indicators", () => {
    const node = toNodeInfo({
      num: 3,
      isFavorite: false,
      isIgnored: false,
      hasXeddsaSigned: true,
      isMuted: true,
      heardOnCurrentLora: false,
      status: "Camping at the lake",
    });
    render(<NodeDetail node={node} />);
    expect(screen.getByText("Camping at the lake")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Signed" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Muted" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Not heard on current LoRa settings",
      }),
    ).toBeInTheDocument();
  });
});
