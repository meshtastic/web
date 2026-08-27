import { PositionValidationSchema } from "@app/validation/config/position.ts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { GenericInput, type InputFieldProps } from "./FormInput.tsx";

type LatitudeForm = { latitude: number | undefined };

/**
 * Mirrors how Position.tsx uses the latitude field: an optional numeric value
 * that starts out `undefined` when the node has no fixed position. The stored
 * form value is echoed into a test-only node, since the bug in #1308 was about
 * what the field committed, not only what it displayed.
 */
function Harness({
  properties,
}: {
  properties: InputFieldProps<LatitudeForm>["properties"];
}) {
  const { control, watch } = useForm<LatitudeForm>({
    defaultValues: { latitude: undefined },
  });

  return (
    <>
      <GenericInput<LatitudeForm>
        control={control}
        field={{
          type: "number",
          name: "latitude",
          label: "Latitude",
          properties,
        }}
      />
      <output data-testid="stored">{String(watch("latitude"))}</output>
    </>
  );
}

// Matches the real latitude/longitude field config in Position.tsx.
const latitudeProperties = { step: 0.0000001, fieldLength: { max: 12 } };

/** GenericInput renders no <label> of its own, so address the input by its id. */
const getInput = () => document.getElementById("latitude") as HTMLInputElement;

const stored = () => screen.getByTestId("stored").textContent;

describe("GenericInput - negative coordinates (issue #1308)", () => {
  it("accepts a pasted negative latitude", async () => {
    const user = userEvent.setup();
    render(<Harness properties={latitudeProperties} />);

    await user.click(getInput());
    await user.paste("-34.1147648");

    expect(stored()).toBe("-34.1147648");
  });

  it("accepts a negative latitude typed one key at a time", async () => {
    const user = userEvent.setup();
    render(<Harness properties={latitudeProperties} />);

    await user.type(getInput(), "-34.1147648");

    expect(stored()).toBe("-34.1147648");
  });

  it("still accepts a positive latitude", async () => {
    const user = userEvent.setup();
    render(<Harness properties={latitudeProperties} />);

    await user.click(getInput());
    await user.paste("34.1147648");

    expect(stored()).toBe("34.1147648");
  });

  it("still rejects input longer than fieldLength.max", async () => {
    const user = userEvent.setup();
    render(<Harness properties={latitudeProperties} />);

    await user.click(getInput());
    await user.paste("-1234.567890123");

    expect(stored()).toBe("undefined");
  });

  it("validates a negative latitude against the position schema", () => {
    expect(PositionValidationSchema.shape.latitude.parse("-34.1147648")).toBe(
      -34.1147648,
    );
  });
});
