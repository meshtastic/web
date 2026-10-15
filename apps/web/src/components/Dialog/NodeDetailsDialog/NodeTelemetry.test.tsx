import { create } from "@bufbuild/protobuf";
import { TelemetrySections } from "@components/Dialog/NodeDetailsDialog/NodeTelemetry.tsx";
import { Protobuf, type TelemetryReading } from "@meshtastic/sdk";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

const T = Protobuf.Telemetry;

const reading = (
  kind: TelemetryReading["kind"],
  value: TelemetryReading["value"],
  ageMs = 60_000,
): TelemetryReading => ({
  nodeNum: 1,
  kind,
  value,
  time: new Date(Date.now() - ageMs),
});

const row = (label: string) => screen.getByText(label).closest("tr");

describe("TelemetrySections", () => {
  it("renders nothing without readings other than deviceMetrics", () => {
    const { container } = render(
      <TelemetrySections
        readings={[
          reading(
            "deviceMetrics",
            create(T.DeviceMetricsSchema, { batteryLevel: 90 }),
          ),
        ]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the latest reading of each variant with units", () => {
    render(
      <TelemetrySections
        readings={[
          reading(
            "environmentMetrics",
            create(T.EnvironmentMetricsSchema, { temperature: 1 }),
            3_600_000,
          ),
          reading(
            "environmentMetrics",
            create(T.EnvironmentMetricsSchema, {
              temperature: 21.46,
              oneWireTemperatureCh0: 18.25,
              oneWireTemperatureCh3: -4,
              adcVoltageCh1: 3.3,
            }),
          ),
          reading(
            "soilWaterMetrics",
            create(T.SoilWaterMetricsSchema, {
              soilPh: 6.82,
              nitrogen: 42,
            }),
          ),
        ]}
      />,
    );

    expect(screen.getByText("Sensors:")).toBeInTheDocument();
    expect(screen.getByText("Environment")).toBeInTheDocument();
    expect(screen.getByText("Soil & Water")).toBeInTheDocument();

    expect(
      within(row("Temperature") as HTMLElement).getByText("21.5 °C"),
    ).toBeInTheDocument();
    expect(
      within(row("One-wire temperature (ch 0)") as HTMLElement).getByText(
        "18.3 °C",
      ),
    ).toBeInTheDocument();
    expect(
      within(row("One-wire temperature (ch 3)") as HTMLElement).getByText(
        "-4.0 °C",
      ),
    ).toBeInTheDocument();
    expect(
      within(row("ADC voltage (ch 1)") as HTMLElement).getByText("3.300 V"),
    ).toBeInTheDocument();
    expect(
      within(row("Soil pH") as HTMLElement).getByText("6.8"),
    ).toBeInTheDocument();
    expect(
      within(row("Nitrogen") as HTMLElement).getByText("42 mg/kg"),
    ).toBeInTheDocument();

    // Absent fields and channels are not rendered.
    expect(screen.queryByText("One-wire temperature (ch 1)")).toBeNull();
    expect(screen.queryByText("Relative humidity")).toBeNull();
    expect(screen.queryByText("1.0 °C")).toBeNull();
  });
});
