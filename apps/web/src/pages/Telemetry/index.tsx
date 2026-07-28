"use client";

import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useNodesAsProto } from "@core/hooks/useNodesAsProto";
import type { ReadonlySignal, TelemetryReading } from "@meshtastic/sdk";
import { useActiveClient, useSignal } from "@meshtastic/sdk-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/UI/Select";
import { numberToHexUnpadded } from "@noble/curves/utils.js";
import { translateStatName } from "./statNames.ts";
import { getStorageDb } from "@core/sdkStorage.ts";
import { useActiveConnectionId } from "@core/stores/deviceStore/selectors.ts";
import {
  type NodeMetricSample,
  SqlocalNodeMetricsRepository,
} from "@meshtastic/sdk-storage-sqlocal/nodeMetrics";

interface DataPoint {
  /** Epoch milliseconds. */
  time: number;
  value: number;
}

const TelemetryChart = ({
  data,
  label,
}: {
  data: DataPoint[];
  label: string;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 600 });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height:
            containerRef.current.clientHeight -
            containerRef.current.clientHeight * 0.1,
        });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = dimensions.width;
    const height = dimensions.height;
    const margin = { top: 40, right: 30, bottom: 80, left: 100 };

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Chart title
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .attr("font-size", "18px")
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .text(label);

    if (data.length === 0) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("fill", "white")
        .text("No data for the selected node and stat");
      return;
    }

    // Create scales — x is time, y is the stat value.
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.time) as [number, number])
      .range([margin.left, width - margin.right]);

    const yScale = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.value) as [number, number])
      .nice()
      .range([height - margin.bottom, margin.top]);

    // Create line + area generators. The area fills down to the x-axis.
    const line = d3
      .line<DataPoint>()
      .x((d) => xScale(d.time))
      .y((d) => yScale(d.value));

    const area = d3
      .area<DataPoint>()
      .x((d) => xScale(d.time))
      .y0(height - margin.bottom)
      .y1((d) => yScale(d.value));

    // Add X axis — labels include the date alongside the time.
    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(6)
          .tickPadding(10)
          .tickFormat((d) => d3.timeFormat("%b %d %H:%M")(d as Date)),
      )
      .attr("color", "white")
      .selectAll("text")
      .attr("fill", "white");

    // Add Y axis
    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale).tickPadding(10))
      .attr("color", "white")
      .selectAll("text")
      .attr("fill", "white");

    // Add area fill (drawn first so the line renders on top)
    svg
      .append("path")
      .datum(data)
      .attr("fill", "steelblue")
      .attr("fill-opacity", 0.3)
      .attr("stroke", "none")
      .attr("d", area);

    // Add line path
    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Add dots
    svg
      .selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", (d) => xScale(d.time))
      .attr("cy", (d) => yScale(d.value))
      .attr("r", 4)
      .attr("fill", "steelblue");

    // Add X axis label
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height - 10)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("font-weight", "500")
      .attr("fill", "white")
      .text("Time");

    // Add Y axis label
    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("font-weight", "500")
      .attr("fill", "white")
      .text(label);

    // Hover interaction: a highlighted focus dot plus an HTML tooltip that
    // snaps to the nearest data point under the cursor.
    const tooltip = d3.select(tooltipRef.current);
    tooltip.style("opacity", "0");

    const dateFmt = d3.timeFormat("%b %d, %Y %H:%M:%S");
    const valueFmt = (v: number) =>
      v.toLocaleString(undefined, { maximumFractionDigits: 4 });
    const bisectTime = d3.bisector((d: DataPoint) => d.time).left;

    const focus = svg
      .append("circle")
      .attr("r", 6)
      .attr("fill", "steelblue")
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .style("opacity", 0)
      .style("pointer-events", "none");

    svg
      .append("rect")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", Math.max(0, width - margin.left - margin.right))
      .attr("height", Math.max(0, height - margin.top - margin.bottom))
      .attr("fill", "transparent")
      .style("cursor", "crosshair")
      .on("mouseenter", () => {
        focus.style("opacity", 1);
        tooltip.style("opacity", "1");
      })
      .on("mouseleave", () => {
        focus.style("opacity", 0);
        tooltip.style("opacity", "0");
      })
      .on("mousemove", (event: MouseEvent) => {
        const [mx] = d3.pointer(event);
        const x0 = +xScale.invert(mx);
        const i = bisectTime(data, x0);
        const dLeft = data[i - 1];
        const dRight = data[i];
        const point = !dLeft
          ? dRight
          : !dRight
            ? dLeft
            : x0 - dLeft.time < dRight.time - x0
              ? dLeft
              : dRight;
        if (!point) return;

        const px = xScale(point.time);
        const py = yScale(point.value);
        focus.attr("cx", px).attr("cy", py);

        // Flip the tooltip to the left of the point near the right edge so it
        // doesn't get clipped by the container's overflow.
        const flip = px > width * 0.6;
        tooltip
          .style("left", `${px + (flip ? -14 : 14)}px`)
          .style("top", `${py}px`)
          .style(
            "transform",
            flip ? "translate(-100%, -50%)" : "translateY(-50%)",
          )
          .html(
            `<div style="font-weight:600">${label}</div>` +
              `<div>${valueFmt(point.value)}</div>` +
              `<div style="opacity:0.75">${dateFmt(new Date(point.time))}</div>`,
          );
      });
  }, [data, label, dimensions]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "600px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      <svg
        ref={svgRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
      <div
        ref={tooltipRef}
        style={{
          position: "absolute",
          pointerEvents: "none",
          opacity: 0,
          background: "rgba(15,23,42,0.95)",
          color: "white",
          padding: "6px 8px",
          borderRadius: "6px",
          fontSize: "12px",
          lineHeight: 1.4,
          whiteSpace: "nowrap",
          border: "1px solid #334155",
          transition: "opacity 0.1s",
          zIndex: 10,
        }}
      />
    </div>
  );
};

// Stable no-op signal used while no client is active or no node is selected,
// so the hook order stays constant across renders.
const EMPTY_TELEMETRY_SIGNAL: ReadonlySignal<TelemetryReading[]> = {
  value: [],
  peek: () => [],
  subscribe: () => () => {},
};

// Telemetry payloads are decoded protobufs that can carry bigint fields,
// which JSON.stringify cannot serialize on its own.
const jsonReplacer = (_key: string, value: unknown) =>
  typeof value === "bigint" ? value.toString() : value;

// A stat is a single numeric field within a telemetry payload, keyed by its
// field name (e.g. "numRxDupe"). Fields that appear in more than one telemetry
// kind (e.g. uptimeSeconds in both deviceMetrics and localStats) collapse to a
// single stat so the dropdown never lists the same stat twice.

function isNumericLike(v: unknown): v is number | bigint {
  return (typeof v === "number" && Number.isFinite(v)) || typeof v === "bigint";
}

function toNumber(v: unknown): number {
  return typeof v === "bigint" ? Number(v) : (v as number);
}

// Display name for a node: its long name (or a fallback) plus the "!hex" id,
// so the node dropdown and the raw-rows header refer to a node the same way.
function nodeDisplayName(node: {
  num: number;
  user?: { longName?: string };
}): string {
  const hex = numberToHexUnpadded(node.num);
  const name =
    node.user?.longName || `Meshtastic ${hex.slice(-4).toUpperCase()}`;
  return `${name} (!${hex})`;
}

const TelemetryPage = () => {
  const nodes = useNodesAsProto();
  const [selectedNode, setSelectedNode] = useState<string>("");
  const [selectedStat, setSelectedStat] = useState<string>("");
  const client = useActiveClient();

  useEffect(() => {
    if (nodes.length > 0 && !selectedNode) {
      setSelectedNode(String(nodes[0].num));
    }
  }, [nodes, selectedNode]);

  // Read the telemetry rows for the selected node. `history()` hydrates from
  // the OPFS-backed SQLite `telemetry` table on first access and returns a
  // signal that stays in sync as new packets arrive.
  const historySignal = useMemo(() => {
    if (!client || !selectedNode) return EMPTY_TELEMETRY_SIGNAL;
    return client.telemetry.history(Number(selectedNode));
  }, [client, selectedNode]);
  const readings = useSignal(historySignal);

  const connectionId = useActiveConnectionId();

  const selectedNodeInfo = useMemo(
    () => nodes.find((n) => String(n.num) === selectedNode),
    [nodes, selectedNode],
  );

  // Node-level metrics (SNR, hops away, last heard) recorded for every node in
  // the `node_metrics` table — the Nodes-page metrics that Telemetry packets
  // don't carry. Reloaded whenever the node is heard again (lastHeard ticks),
  // which is when a fresh sample was most likely just written.
  const [nodeSamples, setNodeSamples] = useState<NodeMetricSample[]>([]);
  const nodeLastHeard = selectedNodeInfo?.lastHeard;
  useEffect(() => {
    let cancelled = false;
    if (connectionId == null || !selectedNode) {
      setNodeSamples([]);
      return;
    }
    getStorageDb()
      .then((db) => {
        const repo = new SqlocalNodeMetricsRepository(db, {
          deviceId: connectionId,
        });
        return repo.loadRecent(Number(selectedNode), 2000);
      })
      .then((samples) => {
        if (!cancelled) setNodeSamples(samples);
      })
      .catch(() => {
        if (!cancelled) setNodeSamples([]);
      });
    return () => {
      cancelled = true;
    };
  }, [connectionId, selectedNode, nodeLastHeard]);

  // Telemetry-packet stats: the numeric fields present on each reading payload
  // (a field shared across kinds collapses to one entry).
  const telemetryStatKeys = useMemo(() => {
    const set = new Set<string>();
    for (const r of readings) {
      const value = r.value as Record<string, unknown> | undefined;
      if (!value) continue;
      for (const [field, v] of Object.entries(value)) {
        if (isNumericLike(v)) set.add(field);
      }
    }
    return set;
  }, [readings]);

  // Node-metric stats recorded in node_metrics for this node.
  const nodeStatKeys = useMemo(
    () => new Set(nodeSamples.map((s) => s.metric)),
    [nodeSamples],
  );

  // Combined, de-duplicated stat list shown in the dropdown.
  const statKeys = useMemo(
    () => Array.from(new Set([...telemetryStatKeys, ...nodeStatKeys])).sort(),
    [telemetryStatKeys, nodeStatKeys],
  );

  // Keep the selected stat valid as the node (and thus available stats) change.
  useEffect(() => {
    if (statKeys.length === 0) {
      if (selectedStat) setSelectedStat("");
      return;
    }
    if (!statKeys.includes(selectedStat)) {
      setSelectedStat(statKeys[0] ?? "");
    }
  }, [statKeys, selectedStat]);

  // Build the time series for the selected stat. Telemetry-packet fields come
  // from the telemetry readings; anything else is a recorded node metric.
  const series = useMemo<DataPoint[]>(() => {
    if (!selectedStat) return [];
    if (telemetryStatKeys.has(selectedStat)) {
      return readings
        .filter((r) =>
          isNumericLike((r.value as Record<string, unknown>)?.[selectedStat]),
        )
        .map((r) => ({
          time: r.time.getTime(),
          value: toNumber((r.value as Record<string, unknown>)[selectedStat]),
        }))
        .sort((a, b) => a.time - b.time);
    }
    return nodeSamples
      .filter((s) => s.metric === selectedStat)
      .map((s) => ({ time: s.time.getTime(), value: s.value }))
      .sort((a, b) => a.time - b.time);
  }, [readings, nodeSamples, selectedStat, telemetryStatKeys]);

  const statLabel = selectedStat
    ? translateStatName(selectedStat)
    : "Telemetry";

  return (
    <PageLayout label="Telemetry" actions={[]} leftBar={<Sidebar />}>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Telemetry Data</h2>
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="max-w-xs flex-1 min-w-48">
            <label className="text-sm font-medium mb-2 block">
              Select Node
            </label>
            <Select value={selectedNode} onValueChange={setSelectedNode}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a node" />
              </SelectTrigger>
              <SelectContent>
                {nodes.map((node) => (
                  <SelectItem key={node.num} value={String(node.num)}>
                    {nodeDisplayName(node)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="max-w-xs flex-1 min-w-48">
            <label className="text-sm font-medium mb-2 block">
              Select Stat
            </label>
            <Select
              value={selectedStat}
              onValueChange={setSelectedStat}
              disabled={statKeys.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    statKeys.length === 0
                      ? "No stats available"
                      : "Choose a stat"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {statKeys.map((key) => (
                  <SelectItem key={key} value={key}>
                    {translateStatName(key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <TelemetryChart data={series} label={statLabel} />
        <details className="mt-6">
          <summary className="text-lg font-semibold mb-2 cursor-pointer select-none">
            Raw telemetry rows for{" "}
            {selectedNodeInfo ? nodeDisplayName(selectedNodeInfo) : "—"} (
            {readings.length})
          </summary>
          <pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-lg overflow-auto max-h-96 mt-2">
            {readings.length === 0
              ? "No telemetry stored for this node yet."
              : readings
                  .map(
                    (r) =>
                      `${r.time.toISOString()}  ${r.kind}\n${JSON.stringify(
                        r.value,
                        jsonReplacer,
                        2,
                      )}`,
                  )
                  .join("\n\n")}
          </pre>
        </details>
      </div>
    </PageLayout>
  );
};

export default TelemetryPage;
