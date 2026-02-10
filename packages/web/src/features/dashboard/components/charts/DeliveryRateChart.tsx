import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@shared/components/ui/chart";
import { Pie, PieChart, ResponsiveContainer } from "recharts";

interface DeliveryRateChartProps {
  data: { name: string; value: number; fill: string }[];
}

export function DeliveryRateChart({ data }: DeliveryRateChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Delivery Rate</CardTitle>
        <CardDescription>Message delivery state breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            ack: {
              label: "Acknowledged",
              theme: {
                light: "oklch(0.60 0.15 145)",
                dark: "oklch(0.65 0.18 145)",
              },
            },
            sent: {
              label: "Sent",
              theme: {
                light: "oklch(0.50 0.15 245)",
                dark: "oklch(0.80 0.10 240)",
              },
            },
            sending: {
              label: "Sending",
              theme: {
                light: "oklch(0.75 0.15 85)",
                dark: "oklch(0.75 0.15 85)",
              },
            },
            waiting: {
              label: "Waiting",
              theme: {
                light: "oklch(0.65 0.02 260)",
                dark: "oklch(0.55 0.02 260)",
              },
            },
            failed: {
              label: "Failed",
              theme: {
                light: "oklch(0.55 0.22 25)",
                dark: "oklch(0.6 0.2 25)",
              },
            },
          }}
          className="h-[250px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                strokeWidth={2}
                className="stroke-background"
              />
              <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
