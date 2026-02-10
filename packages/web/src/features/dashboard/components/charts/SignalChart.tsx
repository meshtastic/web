import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@shared/components/ui/chart";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

interface SignalChartProps {
  data: { time: string; snr: number; rssi: number }[];
}

export function SignalChart({ data }: SignalChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Signal Quality</CardTitle>
        <CardDescription>
          SNR and RSSI from received packets (24h)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            snr: {
              label: "SNR (dB)",
              theme: {
                light: "oklch(0.50 0.15 245)",
                dark: "oklch(0.80 0.10 240)",
              },
            },
            rssi: {
              label: "RSSI (dBm)",
              theme: {
                light: "oklch(0.55 0.22 25)",
                dark: "oklch(0.6 0.2 25)",
              },
            },
          }}
          className="h-[250px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 10, left: -15, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border/50"
              />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickFormatter={(v) => `${v}`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickFormatter={(v) => `${v}`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="snr"
                stroke="var(--color-snr)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-snr)" }}
                name="SNR (dB)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="rssi"
                stroke="var(--color-rssi)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-rssi)" }}
                name="RSSI (dBm)"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
