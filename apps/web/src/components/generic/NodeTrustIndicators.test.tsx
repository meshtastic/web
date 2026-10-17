import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  isNodeUnheardOnCurrentLora,
  NodeTrustIndicators,
} from "./NodeTrustIndicators.tsx";

const node = {
  num: 1,
  isMuted: false,
  hasXeddsaSigned: false,
  heardOnCurrentLora: true,
  viaMqtt: false,
};

describe("isNodeUnheardOnCurrentLora", () => {
  it("is true only for a LoRa node not heard on the current settings", () => {
    expect(isNodeUnheardOnCurrentLora(node)).toBe(false);
    expect(
      isNodeUnheardOnCurrentLora({ ...node, heardOnCurrentLora: false }),
    ).toBe(true);
    expect(
      isNodeUnheardOnCurrentLora({
        ...node,
        heardOnCurrentLora: false,
        viaMqtt: true,
      }),
    ).toBe(false);
  });
});

describe("NodeTrustIndicators", () => {
  it("renders nothing when no signal applies", () => {
    const { container } = render(<NodeTrustIndicators node={node} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the signed indicator", () => {
    render(<NodeTrustIndicators node={{ ...node, hasXeddsaSigned: true }} />);
    expect(screen.getByRole("button", { name: "Signed" })).toBeInTheDocument();
  });

  it("shows the muted indicator", () => {
    render(<NodeTrustIndicators node={{ ...node, isMuted: true }} />);
    expect(screen.getByRole("button", { name: "Muted" })).toBeInTheDocument();
  });

  it("explains an unheard node in a tooltip", async () => {
    render(
      <NodeTrustIndicators node={{ ...node, heardOnCurrentLora: false }} />,
    );
    const trigger = screen.getByRole("button", {
      name: "Not heard on current LoRa settings",
    });
    await userEvent.setup().hover(trigger);
    expect(
      (await screen.findAllByText(/LoRa settings changed/)).length,
    ).toBeGreaterThan(0);
  });

  it("does not flag an MQTT-only node as unheard", () => {
    const { container } = render(
      <NodeTrustIndicators
        node={{ ...node, heardOnCurrentLora: false, viaMqtt: true }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
