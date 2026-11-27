import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ConnectMethod } from "@core/onboarding/capabilities.ts";
import type { RadioInUse } from "@core/connections/radioInUse.ts";
import { PairingErrorStep } from "./PairingErrorStep.tsx";

function renderStep(method: ConnectMethod, inUse?: RadioInUse) {
  render(
    <PairingErrorStep
      actions={{}}
      method={method}
      detail={undefined}
      inUse={inUse}
      certificateUrl={undefined}
      onCertificateTrusted={() => {}}
    />,
  );
}

describe("PairingErrorStep", () => {
  it("says the radio is open somewhere else when its USB port is busy", () => {
    renderStep("serial", "busy");
    expect(
      screen.getByRole("heading", {
        name: "Your radio is open somewhere else",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Another tab or app is using the radio's USB port.",
    );
    expect(
      screen.getByText(/including Meshtastic tabs on another site or port/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/use a data cable/)).toBeNull();
  });

  it.each<ConnectMethod>(["serial", "bluetooth", "http"])(
    "suggests closing other tabs for %s",
    (method) => {
      renderStep(method);
      expect(
        screen.getByRole("heading", { name: "Couldn't connect to your radio" }),
      ).toBeInTheDocument();
      expect(screen.getByText(/Close other/)).toBeInTheDocument();
    },
  );

  it.each<[ConnectMethod, RegExp]>([
    ["serial", /USB port, including Meshtastic tabs on another site/],
    ["bluetooth", /Close other Meshtastic tabs/],
    ["http", /connected to this address/],
  ])(
    "puts closing other tabs first when the %s link was interrupted",
    (method, otherTab) => {
      renderStep(method, "interrupted");
      expect(
        screen.getByRole("heading", { name: "Your radio stopped answering" }),
      ).toBeInTheDocument();
      expect(screen.getAllByRole("listitem")[0]).toHaveTextContent(otherTab);
    },
  );
});
