import { Protobuf } from "@meshtastic/sdk";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import type { RawSecurity } from "@app/validation/config/security.ts";
import {
  PACKET_SIGNATURE_POLICY_OPTIONS,
  PacketAuthenticityPolicyField,
} from "./PacketAuthenticityPolicyField.tsx";

const Policy = Protobuf.Config.Config_SecurityConfig_PacketSignaturePolicy;

const Harness = ({ supported }: { supported: boolean }) => {
  const { control } = useForm<RawSecurity>({
    defaultValues: { packetSignaturePolicy: Policy.BALANCED },
  });

  return (
    <PacketAuthenticityPolicyField
      control={control}
      supported={supported}
      validateSelection={vi.fn().mockResolvedValue(true)}
    />
  );
};

describe("PacketAuthenticityPolicyField", () => {
  it("disables configuration and explains the unavailable capability", () => {
    render(<Harness supported={false} />);

    expect(
      screen.getByRole("combobox", { name: "Protection level" }),
    ).toBeDisabled();
    expect(
      screen.getByText(/disconnected.*XEdDSA verification support/i),
    ).toBeInTheDocument();
  });

  it("presents Compatible, Balanced, and Strict in explicit product order", async () => {
    const user = userEvent.setup();
    render(<Harness supported />);

    expect(Object.keys(PACKET_SIGNATURE_POLICY_OPTIONS)).toEqual([
      "COMPATIBLE",
      "BALANCED",
      "STRICT",
    ]);

    await user.click(
      screen.getByRole("combobox", { name: "Protection level" }),
    );

    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual([
      "Compatible — Accept unsigned",
      "Balanced — Prefer authenticated",
      "Strict — Require authenticated",
    ]);
  });

  it("shows Balanced downgrade-protection copy by default", () => {
    render(<Harness supported />);

    expect(
      screen.getByText(
        /unsigned, signable broadcasts from nodes known to sign/i,
      ),
    ).toBeInTheDocument();
  });
});
